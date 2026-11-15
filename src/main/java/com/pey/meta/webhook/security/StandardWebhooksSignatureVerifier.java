package com.pey.meta.webhook.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * Verificacion de firma con Standard Webhooks (https://www.standardwebhooks.com), que es lo que usa Pey
 * (https://docs.pey.mx/docs/tutorials/getting-started/set-up-webhooks/).
 *
 * Firma esperada: base64(HMAC-SHA256(clave, "webhook-id.webhook-timestamp.cuerpo crudo")), donde la clave son los
 * bytes en base64 que vienen despues del prefijo whsec_ del secreto. El header webhook-signature trae una o varias
 * firmas separadas por espacio con formato "v1,firma"; basta con que una coincida (comparacion en tiempo constante).
 * Se rechaza si webhook-timestamp difiere de la hora actual mas que la tolerancia (5 minutos por defecto).
 *
 * Secreto vacio: se rechazan todos los webhooks, salvo que pey.webhook-allow-unsigned=true (solo desarrollo,
 * apagado por defecto). Un secreto mal formado siempre rechaza.
 */
@Component
public class StandardWebhooksSignatureVerifier implements WebhookSignatureVerifier {

    private static final Logger log = LoggerFactory.getLogger(StandardWebhooksSignatureVerifier.class);

    static final String SECRET_PREFIX = "whsec_";
    static final String HEADER_ID = "webhook-id";
    static final String HEADER_TIMESTAMP = "webhook-timestamp";
    static final String HEADER_SIGNATURE = "webhook-signature";
    private static final String SIGNATURE_VERSION = "v1,";
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final byte[] key;
    private final boolean allowUnsigned;
    private final long toleranceSeconds;
    private final Clock clock;

    @Autowired
    public StandardWebhooksSignatureVerifier(
            @Value("${pey.webhook-secret:}") String secret,
            @Value("${pey.webhook-allow-unsigned:false}") boolean allowUnsigned,
            @Value("${pey.webhook-tolerance-seconds:300}") long toleranceSeconds) {
        this(secret, allowUnsigned, toleranceSeconds, Clock.systemUTC());
    }

    StandardWebhooksSignatureVerifier(String secret, boolean allowUnsigned, long toleranceSeconds, Clock clock) {
        boolean blank = secret == null || secret.isBlank();
        this.key = blank ? null : decodeSecret(secret);
        // El modo sin firma solo aplica si el secreto esta vacio; un secreto mal formado nunca deja pasar nada.
        this.allowUnsigned = blank && allowUnsigned;
        this.toleranceSeconds = toleranceSeconds;
        this.clock = clock;
        if (blank && allowUnsigned) {
            log.warn("PEY_WEBHOOK_SECRET vacio y pey.webhook-allow-unsigned=true: se aceptan webhooks SIN verificar firma. "
                    + "Usalo solo en desarrollo.");
        } else if (blank) {
            log.warn("PEY_WEBHOOK_SECRET vacio: todos los webhooks de Pey se rechazaran con 401.");
        }
    }

    private static byte[] decodeSecret(String secret) {
        String value = secret.trim();
        if (value.startsWith(SECRET_PREFIX)) {
            value = value.substring(SECRET_PREFIX.length());
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            if (decoded.length > 0) {
                return decoded;
            }
        } catch (IllegalArgumentException e) {
            // se reporta abajo
        }
        log.error("PEY_WEBHOOK_SECRET no tiene el formato whsec_<base64>: todos los webhooks se rechazaran con 401.");
        return null;
    }

    @Override
    public boolean verify(byte[] rawBody, HttpHeaders headers) {
        if (key == null) {
            return allowUnsigned;
        }
        String id = headers.getFirst(HEADER_ID);
        String timestampHeader = headers.getFirst(HEADER_TIMESTAMP);
        String signatureHeader = headers.getFirst(HEADER_SIGNATURE);
        if (isBlank(id) || isBlank(timestampHeader) || isBlank(signatureHeader)) {
            log.debug("Webhook sin headers de firma completos");
            return false;
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(timestampHeader.trim());
        } catch (NumberFormatException e) {
            log.debug("webhook-timestamp invalido: {}", timestampHeader);
            return false;
        }
        long now = clock.instant().getEpochSecond();
        if (Math.abs(now - timestamp) > toleranceSeconds) {
            log.debug("webhook-timestamp fuera de tolerancia: {} (ahora {})", timestamp, now);
            return false;
        }

        byte[] expected = (SIGNATURE_VERSION + sign(id.trim(), timestamp, rawBody == null ? new byte[0] : rawBody))
                .getBytes(StandardCharsets.UTF_8);
        boolean match = false;
        for (String candidate : signatureHeader.trim().split(" ")) {
            if (!candidate.isEmpty()
                    && MessageDigest.isEqual(candidate.getBytes(StandardCharsets.UTF_8), expected)) {
                match = true; // no se sale antes para no filtrar cual firma coincidio
            }
        }
        return match;
    }

    String sign(String id, long timestamp, byte[] body) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(key, HMAC_ALGORITHM));
            mac.update((id + "." + timestamp + ".").getBytes(StandardCharsets.UTF_8));
            mac.update(body);
            return Base64.getEncoder().encodeToString(mac.doFinal());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo calcular HMAC-SHA256", e);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
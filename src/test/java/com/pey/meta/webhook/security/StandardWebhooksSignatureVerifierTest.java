package com.pey.meta.webhook.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class StandardWebhooksSignatureVerifierTest {

    private static final String SECRET_B64 = "MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
    private static final String SECRET = "whsec_" + SECRET_B64;
    private static final long NOW = 1790724818L;
    private static final String BODY = "{\"amount\":150,\"numRef\":\"1234567\",\"type\":\"codi.qr.payment_received\"}";

    private static StandardWebhooksSignatureVerifier verifier(String secret, boolean allowUnsigned, long now) {
        return new StandardWebhooksSignatureVerifier(secret, allowUnsigned, 300,
                Clock.fixed(Instant.ofEpochSecond(now), ZoneOffset.UTC));
    }

    private static String hmac(String secretB64, String id, long ts, String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(Base64.getDecoder().decode(secretB64), "HmacSHA256"));
        return Base64.getEncoder().encodeToString(
                mac.doFinal((id + "." + ts + "." + body).getBytes(StandardCharsets.UTF_8)));
    }

    private static HttpHeaders headers(String id, String ts, String signature) {
        HttpHeaders h = new HttpHeaders();
        if (id != null) h.add("webhook-id", id);
        if (ts != null) h.add("webhook-timestamp", ts);
        if (signature != null) h.add("webhook-signature", signature);
        return h;
    }

    private static byte[] bytes(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void aceptaElVectorDePruebaDeStandardWebhooks() {
        StandardWebhooksSignatureVerifier v = verifier(SECRET, false, 1614265330L);

        boolean ok = v.verify(bytes("{\"test\": 2432232314}"),
                headers("msg_p5jXN8AQM9LWM0D4loKWxJek", "1614265330", "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE="));

        assertThat(ok).isTrue();
    }

    @Test
    void aceptaFirmaValida() throws Exception {
        String sig = hmac(SECRET_B64, "msg_1", NOW, BODY);
        assertThat(verifier(SECRET, false, NOW).verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), "v1," + sig))).isTrue();
    }

    @Test
    void aceptaSecretoSinPrefijo() throws Exception {
        String sig = hmac(SECRET_B64, "msg_1", NOW, BODY);
        assertThat(verifier(SECRET_B64, false, NOW).verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), "v1," + sig))).isTrue();
    }

    @Test
    void aceptaSiUnaDeVariasFirmasCoincide() throws Exception {
        String sig = hmac(SECRET_B64, "msg_1", NOW, BODY);
        String header = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= v1," + sig;
        assertThat(verifier(SECRET, false, NOW).verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), header))).isTrue();
    }

    @Test
    void rechazaCuerpoAlterado() throws Exception {
        String sig = hmac(SECRET_B64, "msg_1", NOW, BODY);
        String alterado = BODY.replace("150", "999");
        assertThat(verifier(SECRET, false, NOW).verify(bytes(alterado), headers("msg_1", String.valueOf(NOW), "v1," + sig))).isFalse();
    }

    @Test
    void rechazaOtroSecreto() throws Exception {
        String otro = Base64.getEncoder().encodeToString(bytes("otro-secreto-de-32-bytes-123456"));
        String sig = hmac(otro, "msg_1", NOW, BODY);
        assertThat(verifier(SECRET, false, NOW).verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), "v1," + sig))).isFalse();
    }

    @Test
    void rechazaOtroIdOVersionDistinta() throws Exception {
        String sig = hmac(SECRET_B64, "msg_1", NOW, BODY);
        StandardWebhooksSignatureVerifier v = verifier(SECRET, false, NOW);
        assertThat(v.verify(bytes(BODY), headers("msg_2", String.valueOf(NOW), "v1," + sig))).isFalse();
        assertThat(v.verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), "v2," + sig))).isFalse();
        assertThat(v.verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), sig))).isFalse();
    }

    @Test
    void rechazaTimestampViejoOFuturo() throws Exception {
        long viejo = NOW - 301;
        long futuro = NOW + 301;
        StandardWebhooksSignatureVerifier v = verifier(SECRET, false, NOW);
        assertThat(v.verify(bytes(BODY), headers("msg_1", String.valueOf(viejo), "v1," + hmac(SECRET_B64, "msg_1", viejo, BODY)))).isFalse();
        assertThat(v.verify(bytes(BODY), headers("msg_1", String.valueOf(futuro), "v1," + hmac(SECRET_B64, "msg_1", futuro, BODY)))).isFalse();
        long enElLimite = NOW - 300;
        assertThat(v.verify(bytes(BODY), headers("msg_1", String.valueOf(enElLimite), "v1," + hmac(SECRET_B64, "msg_1", enElLimite, BODY)))).isTrue();
    }

    @Test
    void rechazaHeadersFaltantesOTimestampNoNumerico() throws Exception {
        String sig = "v1," + hmac(SECRET_B64, "msg_1", NOW, BODY);
        StandardWebhooksSignatureVerifier v = verifier(SECRET, false, NOW);
        assertThat(v.verify(bytes(BODY), headers(null, String.valueOf(NOW), sig))).isFalse();
        assertThat(v.verify(bytes(BODY), headers("msg_1", null, sig))).isFalse();
        assertThat(v.verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), null))).isFalse();
        assertThat(v.verify(bytes(BODY), headers("msg_1", "ayer", sig))).isFalse();
    }

    @Test
    void secretoVacioRechazaPorDefecto() {
        assertThat(verifier("", false, NOW).verify(bytes(BODY), headers("msg_1", String.valueOf(NOW), "v1,x"))).isFalse();
        assertThat(verifier(null, false, NOW).verify(bytes(BODY), new HttpHeaders())).isFalse();
    }

    @Test
    void secretoVacioConFlagExplicitoPermite() {
        assertThat(verifier("", true, NOW).verify(bytes(BODY), new HttpHeaders())).isTrue();
    }

    @Test
    void secretoMalFormadoRechazaAunqueEsteElFlag() {
        assertThat(verifier("whsec_no es base64!!", true, NOW).verify(bytes(BODY), new HttpHeaders())).isFalse();
    }
}
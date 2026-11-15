package com.pey.meta.webhook.security;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * Implementacion temporal: acepta todo.
 *
 * TODO(WebhookBot): verificar la firma con Standard Webhooks (https://www.standardwebhooks.com).
 * Segun esa especificacion se firma "webhook-id.webhook-timestamp.cuerpo" con HMAC-SHA256 y el secreto
 * del endpoint, y se compara contra las firmas "v1,..." del header webhook-signature; ademas se rechaza
 * un timestamp muy viejo. Confirmar en https://docs.pey.mx que headers manda Pey y de donde sale el secreto,
 * leer el secreto de una variable de entorno (nunca en codigo) y reemplazar este bean.
 * No se implementa todavia porque no se pidio.
 */
@Component
public class NoOpWebhookSignatureVerifier implements WebhookSignatureVerifier {

    @Override
    public boolean verify(String rawBody, HttpHeaders headers) {
        return true;
    }
}
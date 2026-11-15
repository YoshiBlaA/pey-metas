package com.pey.meta.webhook.security;

import org.springframework.http.HttpHeaders;

/**
 * Verifica la firma del webhook de Pey. Recibe el cuerpo crudo (bytes exactos que mando Pey)
 * porque la firma se calcula sobre esos bytes, no sobre el JSON ya parseado.
 */
@FunctionalInterface
public interface WebhookSignatureVerifier {

    /** @return true si la firma es valida. */
    boolean verify(byte[] rawBody, HttpHeaders headers);
}
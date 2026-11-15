package com.pey.meta.webhook.security;

import org.springframework.http.HttpHeaders;

/**
 * Punto de extension para verificar la firma del webhook de Pey (header webhook-signature, Standard Webhooks).
 * Recibe el cuerpo crudo porque la firma se calcula sobre los bytes exactos que mando Pey.
 */
@FunctionalInterface
public interface WebhookSignatureVerifier {

    /** @return true si la firma es valida (o si la verificacion aun no esta activa). */
    boolean verify(String rawBody, HttpHeaders headers);
}
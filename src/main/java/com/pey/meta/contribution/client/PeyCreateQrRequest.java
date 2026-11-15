package com.pey.meta.contribution.client;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Cuerpo de POST /codi/qr segun https://docs.pey.mx/openapi.json.
 * amount (MXN, >= 0), concept, expiration (segundos; 0 = sin vencimiento, minimo 360),
 * numRef (^[0-9]{1,7}$), generateImage (si true Pey regresa qrImage en base64).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PeyCreateQrRequest(
        BigDecimal amount,
        String concept,
        Integer expiration,
        String numRef,
        Boolean generateImage) {
}
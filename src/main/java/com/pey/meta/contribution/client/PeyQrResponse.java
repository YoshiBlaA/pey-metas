package com.pey.meta.contribution.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Respuesta 201 de POST /codi/qr segun https://docs.pey.mx/openapi.json.
 * id: IDC del QR asignado por Banxico; qrString: payload para dibujar el QR;
 * qrImage: PNG en base64, solo si se pidio generateImage (puede venir null).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PeyQrResponse(
        String id,
        String qrString,
        String qrImage) {
}
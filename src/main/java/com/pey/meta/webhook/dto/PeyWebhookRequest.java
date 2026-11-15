package com.pey.meta.webhook.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Cuerpo del webhook que manda Pey (campos tomados de https://docs.pey.mx).
 * Se ignoran campos desconocidos para no romper si Pey agrega nuevos.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Aviso de Pey cuando se recibe un pago de un QR de CoDi")
public record PeyWebhookRequest(
        @Schema(description = "Monto pagado en MXN, reportado por Pey", example = "150")
        BigDecimal amount,
        @Schema(description = "Id de la API key de Pey que creo el cobro", example = "01M3QMMR6X9CBVDY1SF3G8QBJW")
        String apiKeyId,
        @Schema(description = "Id del QR de CoDi (coincide con codiQrId guardado al crear el cobro)", example = "01HXYZQR1234567890ABCDEFGH")
        String codiQrId,
        @Schema(description = "Concepto del cobro", example = "Aportacion a la meta")
        String concept,
        @Schema(description = "Fecha de pago en epoch (segundos)", example = "1790724818")
        Long datePaid,
        @Schema(description = "Referencia numerica del cobro (amarra el pago con la aportacion)", example = "1234567")
        String numRef,
        @Schema(description = "Id de la transaccion en Pey", example = "01HXYZTXN1234567890RSTUVWX")
        String transactionId,
        @Schema(description = "Tipo de evento", example = "codi.qr.payment_received")
        String type) {

    public static final String TYPE_QR_PAYMENT_RECEIVED = "codi.qr.payment_received";
}
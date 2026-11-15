package com.pey.meta.webhook.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Acuse de recibo del webhook")
public record WebhookAckResponse(
        @Schema(description = "true si el aviso se recibio y se atendio", example = "true")
        boolean received,
        @Schema(description = "Que se hizo con el aviso: PROCESSED, DUPLICATE, UNKNOWN_NUM_REF, IGNORED_EVENT, INVALID_PAYLOAD, INVALID_SIGNATURE, MALFORMED_JSON",
                example = "PROCESSED")
        String result) {
}
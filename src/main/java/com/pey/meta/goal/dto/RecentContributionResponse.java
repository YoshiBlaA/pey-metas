package com.pey.meta.goal.dto;

import java.math.BigDecimal;
import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Aportacion pagada que se muestra en el detalle publico")
public record RecentContributionResponse(
        @Schema(description = "Nombre o apodo, o \"An\u00f3nimo\"", example = "Maru")
        String name,
        BigDecimal amount,
        String message,
        java.time.Instant paidAt) {
}
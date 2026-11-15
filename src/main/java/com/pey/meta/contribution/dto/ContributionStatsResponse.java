package com.pey.meta.contribution.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Conteos de aportaciones por estado (de una meta o de todas)")
public record ContributionStatsResponse(
        long paid,
        @Schema(description = "PENDING todavia vigentes")
        long pending,
        @Schema(description = "EXPIRED mas los PENDING ya vencidos")
        long expired,
        @Schema(description = "Suma de lo pagado en los ultimos 7 dias, en MXN")
        BigDecimal paidAmountLast7Days) {
}

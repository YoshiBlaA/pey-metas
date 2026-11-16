package com.pey.meta.contribution.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.pey.meta.contribution.entity.ContributionStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Aportacion para el panel de admin (cualquier estado)")
public record AdminContributionResponse(
        Long id,
        @Schema(description = "Referencia numerica del cobro en Pey/CoDi", example = "4821937")
        String numRef,
        Long goalId,
        String goalTitle,
        @Schema(description = "Nombre o apodo, o \"Anónimo\"", example = "Maru")
        String name,
        boolean anonymous,
        @Schema(nullable = true)
        String message,
        BigDecimal amount,
        @Schema(description = "PENDING, PAID o EXPIRED. Un PENDING vencido se reporta como EXPIRED")
        ContributionStatus status,
        Instant createdAt,
        Instant expiresAt,
        @Schema(nullable = true)
        Instant paidAt) {
}

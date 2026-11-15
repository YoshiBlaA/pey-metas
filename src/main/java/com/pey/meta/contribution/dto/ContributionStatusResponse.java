package com.pey.meta.contribution.dto;

import java.math.BigDecimal;
import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

import com.pey.meta.contribution.entity.ContributionStatus;

@Schema(description = "Estado de una aportaci\u00f3n para hacer polling")
public record ContributionStatusResponse(
        String numRef,
        Long goalId,
        @Schema(description = "PENDING, PAID o EXPIRED. Un PENDING vencido se reporta como EXPIRED")
        ContributionStatus status,
        BigDecimal amount,
        Instant expiresAt,
        @Schema(nullable = true)
        Instant paidAt) {
}
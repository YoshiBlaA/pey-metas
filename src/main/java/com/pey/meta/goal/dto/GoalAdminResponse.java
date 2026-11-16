package com.pey.meta.goal.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.pey.meta.goal.entity.GoalStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Meta completa para el panel de admin")
public record GoalAdminResponse(
        Long id,
        String title,
        String description,
        @Schema(description = "Quien organiza la meta", nullable = true)
        String organizer,
        @Schema(description = "Ciudad de la meta", nullable = true)
        String city,
        BigDecimal targetAmount,
        BigDecimal raisedAmount,
        @Schema(description = "Porcentaje entero 0-100; solo marca 100 cuando de verdad se alcanzo la meta")
        int percentage,
        GoalStatus status,
        List<BigDecimal> presetAmounts,
        Instant createdAt,
        Instant updatedAt) {
}
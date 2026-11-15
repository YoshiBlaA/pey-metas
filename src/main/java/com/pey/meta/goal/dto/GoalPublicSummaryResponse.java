package com.pey.meta.goal.dto;

import java.math.BigDecimal;
import java.util.List;

import com.pey.meta.goal.entity.GoalStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Meta para la lista publica")
public record GoalPublicSummaryResponse(
        Long id,
        String title,
        String description,
        BigDecimal targetAmount,
        BigDecimal raisedAmount,
        @Schema(description = "Porcentaje entero 0-100; solo marca 100 cuando de verdad se alcanzo la meta")
        int percentage,
        GoalStatus status,
        List<BigDecimal> presetAmounts) {
}
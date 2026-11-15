package com.pey.meta.goal.dto;

import java.math.BigDecimal;
import java.util.List;

import com.pey.meta.goal.entity.GoalStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Detalle publico de una meta con su progreso; pensado para consultarse por polling")
public record GoalPublicDetailResponse(
        Long id,
        String title,
        String description,
        BigDecimal targetAmount,
        BigDecimal raisedAmount,
        @Schema(description = "Porcentaje entero 0-100; solo marca 100 cuando de verdad se alcanzo la meta")
        int percentage,
        GoalStatus status,
        List<BigDecimal> presetAmounts,
        @Schema(description = "Numero de aportaciones pagadas")
        long paidContributionsCount,
        @Schema(description = "Ultimas aportaciones pagadas, de la mas reciente a la mas antigua")
        List<RecentContributionResponse> recentContributions) {
}
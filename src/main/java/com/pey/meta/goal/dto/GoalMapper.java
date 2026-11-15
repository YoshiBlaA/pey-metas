package com.pey.meta.goal.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.service.PaidContributionView;

/**
 * Convierte la entidad Goal a las respuestas de la API.
 */
public final class GoalMapper {

    public static final String ANONYMOUS_NAME = "An\u00f3nimo";

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private GoalMapper() {
    }

    /**
     * Porcentaje entero redondeado (HALF_UP) entre 0 y 100. Si todavia no se alcanza la meta
     * nunca marca 100 (por ejemplo 99.6% sale 99), para que la barra no se vea llena antes de tiempo.
     */
    public static int percentage(BigDecimal raised, BigDecimal target) {
        if (raised == null || target == null || target.signum() <= 0 || raised.signum() <= 0) {
            return 0;
        }
        if (raised.compareTo(target) >= 0) {
            return 100;
        }
        int pct = raised.multiply(HUNDRED).divide(target, 0, RoundingMode.HALF_UP).intValue();
        return Math.min(pct, 99);
    }

    public static GoalAdminResponse toAdmin(Goal g) {
        return new GoalAdminResponse(g.getId(), g.getTitle(), g.getDescription(), g.getTargetAmount(),
                g.getRaisedAmount(), percentage(g.getRaisedAmount(), g.getTargetAmount()), g.getStatus(),
                List.copyOf(g.getPresetAmounts()), g.getCreatedAt(), g.getUpdatedAt());
    }

    public static GoalPublicSummaryResponse toPublicSummary(Goal g) {
        return new GoalPublicSummaryResponse(g.getId(), g.getTitle(), g.getDescription(), g.getTargetAmount(),
                g.getRaisedAmount(), percentage(g.getRaisedAmount(), g.getTargetAmount()), g.getStatus(),
                List.copyOf(g.getPresetAmounts()));
    }

    public static GoalPublicDetailResponse toPublicDetail(Goal g, long paidCount,
                                                          List<RecentContributionResponse> recent) {
        return new GoalPublicDetailResponse(g.getId(), g.getTitle(), g.getDescription(), g.getTargetAmount(),
                g.getRaisedAmount(), percentage(g.getRaisedAmount(), g.getTargetAmount()), g.getStatus(),
                List.copyOf(g.getPresetAmounts()), paidCount, recent == null ? List.of() : recent);
    }

    /** Si pago como anonimo o no dejo nombre, se muestra "Anonimo" (con acento). */
    public static RecentContributionResponse toRecent(PaidContributionView v) {
        String name = v.displayName() == null ? "" : v.displayName().trim();
        if (v.anonymous() || name.isEmpty()) {
            name = ANONYMOUS_NAME;
        }
        return new RecentContributionResponse(name, v.amount(), v.message(), v.paidAt());
    }
}
package com.pey.meta.goal.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.pey.meta.goal.service.PaidContributionView;

class GoalMapperTest {

    private static int pct(String raised, String target) {
        return GoalMapper.percentage(new BigDecimal(raised), new BigDecimal(target));
    }

    @Test
    void percentageIsRoundedAndCapped() {
        assertThat(pct("0", "1000")).isZero();
        assertThat(pct("333.33", "1000")).isEqualTo(33);
        assertThat(pct("335.00", "1000")).isEqualTo(34);
        assertThat(pct("995.00", "1000")).isEqualTo(99);
        assertThat(pct("1000.00", "1000")).isEqualTo(100);
        assertThat(pct("1500.00", "1000")).isEqualTo(100);
    }

    @Test
    void anonymousOrBlankNameShowsAnonimo() {
        Instant now = Instant.now();
        assertThat(GoalMapper.toRecent(new PaidContributionView("Maru", true, BigDecimal.TEN, "hola", now)).name())
                .isEqualTo("An\u00f3nimo");
        assertThat(GoalMapper.toRecent(new PaidContributionView("  ", false, BigDecimal.TEN, null, now)).name())
                .isEqualTo("An\u00f3nimo");
        assertThat(GoalMapper.toRecent(new PaidContributionView(" Maru ", false, BigDecimal.TEN, "hola", now)).name())
                .isEqualTo("Maru");
    }
}
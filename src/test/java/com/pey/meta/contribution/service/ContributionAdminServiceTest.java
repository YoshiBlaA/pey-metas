package com.pey.meta.contribution.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import com.pey.meta.contribution.dto.AdminContributionResponse;
import com.pey.meta.contribution.dto.ContributionStatsResponse;
import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.repository.GoalRepository;

/** Consultas del admin contra H2: estado efectivo, filtros y conteos. */
@DataJpaTest
@Import(ContributionAdminService.class)
class ContributionAdminServiceTest {

    @Autowired
    private ContributionAdminService service;
    @Autowired
    private ContributionRepository contributionRepository;
    @Autowired
    private GoalRepository goalRepository;

    private Goal goalA;
    private Goal goalB;
    private int ref = 1;

    @BeforeEach
    void setUp() {
        goalA = goalRepository.save(goal("Laptop"));
        goalB = goalRepository.save(goal("Medicinas"));
        Instant now = Instant.now();
        save(goalA, ContributionStatus.PAID, "100.00", now.plusSeconds(600), now.minus(Duration.ofDays(1)), "Mariana", false);
        save(goalA, ContributionStatus.PAID, "50.00", now.plusSeconds(600), now.minus(Duration.ofDays(10)), "Beto", true);
        save(goalA, ContributionStatus.PENDING, "20.00", now.plusSeconds(600), null, "Fer", false);
        save(goalA, ContributionStatus.PENDING, "30.00", now.minusSeconds(5), null, null, false);
        save(goalA, ContributionStatus.EXPIRED, "40.00", now.minusSeconds(900), null, "Ana", false);
        save(goalB, ContributionStatus.PAID, "200.00", now.plusSeconds(600), now.minus(Duration.ofHours(2)), "Luis", false);
    }

    @Test
    void statsCountsEffectiveStatusPerGoal() {
        ContributionStatsResponse a = service.stats(goalA.getId());
        assertThat(a.paid()).isEqualTo(2);
        assertThat(a.pending()).isEqualTo(1);
        assertThat(a.expired()).isEqualTo(2);
        assertThat(a.paidAmountLast7Days()).isEqualByComparingTo("100.00");

        ContributionStatsResponse all = service.stats(null);
        assertThat(all.paid()).isEqualTo(3);
        assertThat(all.paidAmountLast7Days()).isEqualByComparingTo("300.00");
    }

    @Test
    void listFiltersByGoalAndEffectiveStatus() {
        List<AdminContributionResponse> expired = service.list(goalA.getId(), ContributionStatus.EXPIRED, 50);
        assertThat(expired).hasSize(2).allMatch(c -> c.status() == ContributionStatus.EXPIRED);
        assertThat(expired).extracting(AdminContributionResponse::name).containsExactlyInAnyOrder("Anónimo", "Ana");

        List<AdminContributionResponse> pending = service.list(goalA.getId(), ContributionStatus.PENDING, 50);
        assertThat(pending).extracting(AdminContributionResponse::name).containsExactly("Fer");

        List<AdminContributionResponse> all = service.list(null, null, 50);
        assertThat(all).hasSize(6);
        assertThat(all).filteredOn(c -> c.amount().compareTo(new BigDecimal("50.00")) == 0)
                .extracting(AdminContributionResponse::name).containsExactly("Anónimo");
        assertThat(all).extracting(AdminContributionResponse::goalTitle).contains("Laptop", "Medicinas");
        assertThat(service.list(null, null, 2)).hasSize(2);
    }

    private static Goal goal(String title) {
        Goal g = new Goal();
        g.setTitle(title);
        g.setTargetAmount(new BigDecimal("1000.00"));
        return g;
    }

    private void save(Goal goal, ContributionStatus status, String amount, Instant expiresAt, Instant paidAt,
                      String name, boolean anonymous) {
        Contribution c = new Contribution();
        c.setGoal(goal);
        c.setStatus(status);
        c.setAmount(new BigDecimal(amount));
        c.setExpiresAt(expiresAt);
        c.setPaidAt(paidAt);
        c.setDisplayName(name);
        c.setAnonymous(anonymous);
        c.setNumRef(String.valueOf(ref++));
        contributionRepository.save(c);
    }
}

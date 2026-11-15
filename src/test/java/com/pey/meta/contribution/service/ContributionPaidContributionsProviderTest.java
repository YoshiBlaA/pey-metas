package com.pey.meta.contribution.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.service.PaidContributionView;

@ExtendWith(MockitoExtension.class)
class ContributionPaidContributionsProviderTest {

    @Mock
    private ContributionRepository repository;

    @InjectMocks
    private ContributionPaidContributionsProvider provider;

    private static Contribution paid(String name, boolean anonymous, String amount, Instant paidAt) {
        Contribution c = new Contribution();
        c.setDisplayName(name);
        c.setAnonymous(anonymous);
        c.setAmount(new BigDecimal(amount));
        c.setMessage("hola");
        c.setStatus(ContributionStatus.PAID);
        c.setPaidAt(paidAt);
        return c;
    }

    @Test
    void countPaidUsesPaidStatus() {
        when(repository.countByGoalIdAndStatus(1L, ContributionStatus.PAID)).thenReturn(3L);
        assertThat(provider.countPaid(1L)).isEqualTo(3L);
    }

    @Test
    void findLatestPaidMapsInRepositoryOrder() {
        Instant t2 = Instant.parse("2026-11-15T16:05:00Z");
        Instant t1 = Instant.parse("2026-11-15T16:00:00Z");
        when(repository.findByGoalIdAndStatusOrderByPaidAtDesc(1L, ContributionStatus.PAID, PageRequest.of(0, 5)))
                .thenReturn(List.of(paid("Ana", false, "20.00", t2), paid("Secreto", true, "10.00", t1)));

        List<PaidContributionView> views = provider.findLatestPaid(1L, 5);

        assertThat(views).containsExactly(
                new PaidContributionView("Ana", false, new BigDecimal("20.00"), "hola", t2),
                new PaidContributionView("Secreto", true, new BigDecimal("10.00"), "hola", t1));
    }

    @Test
    void nonPositiveLimitReturnsEmpty() {
        assertThat(provider.findLatestPaid(1L, 0)).isEmpty();
        verifyNoInteractions(repository);
    }
}
package com.pey.meta.webhook.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;

@ExtendWith(MockitoExtension.class)
class ContributionExpirationJobTest {

    private static final Instant NOW = Instant.parse("2026-11-15T16:00:00Z");

    @Mock
    private ContributionRepository contributionRepository;
    @Mock
    private EntityManager entityManager;

    private static Contribution pending(String numRef) {
        Contribution c = new Contribution();
        c.setNumRef(numRef);
        c.setStatus(ContributionStatus.PENDING);
        c.setExpiresAt(NOW.minusSeconds(30));
        return c;
    }

    @Test
    void marcaExpiradasLasPendientesVencidas() {
        ContributionExpirationJob job = new ContributionExpirationJob(contributionRepository, entityManager,
                Clock.fixed(NOW, ZoneOffset.UTC));
        Contribution vencida = pending("1111111");
        Contribution pagadaMientras = pending("2222222");
        when(contributionRepository.findByStatusAndExpiresAtBefore(ContributionStatus.PENDING, NOW))
                .thenReturn(List.of(vencida, pagadaMientras));
        // Simula que el webhook la pago justo antes de bloquearla.
        doAnswer(inv -> {
            if (inv.getArgument(0) == pagadaMientras) {
                pagadaMientras.setStatus(ContributionStatus.PAID);
            }
            return null;
        }).when(entityManager).refresh(any(), eq(LockModeType.PESSIMISTIC_WRITE));

        int expired = job.expireOverdue();

        assertThat(expired).isEqualTo(1);
        assertThat(vencida.getStatus()).isEqualTo(ContributionStatus.EXPIRED);
        assertThat(pagadaMientras.getStatus()).isEqualTo(ContributionStatus.PAID);
    }

    @Test
    void sinVencidasNoHaceNada() {
        ContributionExpirationJob job = new ContributionExpirationJob(contributionRepository, entityManager,
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(contributionRepository.findByStatusAndExpiresAtBefore(ContributionStatus.PENDING, NOW)).thenReturn(List.of());

        assertThat(job.expireOverdue()).isZero();
    }
}
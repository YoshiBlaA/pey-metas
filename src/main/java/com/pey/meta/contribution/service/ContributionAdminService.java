package com.pey.meta.contribution.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.contribution.dto.AdminContributionResponse;
import com.pey.meta.contribution.dto.ContributionMapper;
import com.pey.meta.contribution.dto.ContributionStatsResponse;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;

/**
 * Consultas de aportaciones para el panel de admin: lista con cualquier estado y conteos por estado.
 * Igual que el estado publico, un PENDING vencido se reporta como EXPIRED.
 */
@Service
public class ContributionAdminService {

    public static final int DEFAULT_LIMIT = 200;
    public static final int MAX_LIMIT = 1000;
    static final Duration WEEK = Duration.ofDays(7);

    private final ContributionRepository contributionRepository;
    private final Clock clock;

    @Autowired
    public ContributionAdminService(ContributionRepository contributionRepository) {
        this(contributionRepository, Clock.systemUTC());
    }

    ContributionAdminService(ContributionRepository contributionRepository, Clock clock) {
        this.contributionRepository = contributionRepository;
        this.clock = clock;
    }

    /** Mas nuevas primero; goalId y status opcionales; limit entre 1 y {@link #MAX_LIMIT}. */
    @Transactional(readOnly = true)
    public List<AdminContributionResponse> list(Long goalId, ContributionStatus status, int limit) {
        Instant now = clock.instant();
        int size = Math.max(1, Math.min(limit, MAX_LIMIT));
        return contributionRepository.searchForAdmin(goalId, status == null,
                        status == ContributionStatus.PAID, status == ContributionStatus.PENDING,
                        status == ContributionStatus.EXPIRED, now, PageRequest.of(0, size)).stream()
                .map(c -> ContributionMapper.toAdmin(c, ContributionService.effectiveStatus(c, now)))
                .toList();
    }

    /** Conteos por estado efectivo y lo pagado en los ultimos 7 dias; goalId opcional (null = todas). */
    @Transactional(readOnly = true)
    public ContributionStatsResponse stats(Long goalId) {
        Instant now = clock.instant();
        return new ContributionStatsResponse(
                contributionRepository.countPaid(goalId),
                contributionRepository.countActivePending(goalId, now),
                contributionRepository.countEffectiveExpired(goalId, now),
                contributionRepository.sumPaidSince(goalId, now.minus(WEEK)));
    }
}

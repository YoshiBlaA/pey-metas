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

    /** Solo de metas del admin ownerId, mas nuevas primero; goalId y status opcionales; limit entre 1 y {@link #MAX_LIMIT}. */
    @Transactional(readOnly = true)
    public List<AdminContributionResponse> list(Long ownerId, Long goalId, ContributionStatus status, int limit) {
        Instant now = clock.instant();
        int size = Math.max(1, Math.min(limit, MAX_LIMIT));
        return contributionRepository.searchForAdmin(ownerId, goalId, status == null,
                        status == ContributionStatus.PAID, status == ContributionStatus.PENDING,
                        status == ContributionStatus.EXPIRED, now, PageRequest.of(0, size)).stream()
                .map(c -> ContributionMapper.toAdmin(c, ContributionService.effectiveStatus(c, now)))
                .toList();
    }

    /** Conteos por estado efectivo y lo pagado en 7 dias de las metas del admin; goalId opcional (null = todas). */
    @Transactional(readOnly = true)
    public ContributionStatsResponse stats(Long ownerId, Long goalId) {
        Instant now = clock.instant();
        return new ContributionStatsResponse(
                contributionRepository.countPaid(ownerId, goalId),
                contributionRepository.countActivePending(ownerId, goalId, now),
                contributionRepository.countEffectiveExpired(ownerId, goalId, now),
                contributionRepository.sumPaidSince(ownerId, goalId, now.minus(WEEK)));
    }
}

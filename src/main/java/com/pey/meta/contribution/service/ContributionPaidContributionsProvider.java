package com.pey.meta.contribution.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.service.PaidContributionView;
import com.pey.meta.goal.service.PaidContributionsProvider;

/**
 * Implementacion para GoalService (peticion de MetaBot): cuenta y lista aportaciones PAID de una meta.
 * El nombre "Anonimo" lo resuelve GoalMapper.
 */
@Component
public class ContributionPaidContributionsProvider implements PaidContributionsProvider {

    private final ContributionRepository contributionRepository;

    public ContributionPaidContributionsProvider(ContributionRepository contributionRepository) {
        this.contributionRepository = contributionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public long countPaid(Long goalId) {
        return contributionRepository.countByGoalIdAndStatus(goalId, ContributionStatus.PAID);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaidContributionView> findLatestPaid(Long goalId, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        return contributionRepository
                .findByGoalIdAndStatusOrderByPaidAtDesc(goalId, ContributionStatus.PAID, PageRequest.of(0, limit))
                .stream()
                .map(ContributionPaidContributionsProvider::toView)
                .toList();
    }

    static PaidContributionView toView(Contribution c) {
        return new PaidContributionView(c.getDisplayName(), c.isAnonymous(), c.getAmount(), c.getMessage(),
                c.getPaidAt());
    }
}
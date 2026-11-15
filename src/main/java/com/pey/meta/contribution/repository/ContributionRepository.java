package com.pey.meta.contribution.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;

public interface ContributionRepository extends JpaRepository<Contribution, Long> {

    Optional<Contribution> findByNumRef(String numRef);

    boolean existsByNumRef(String numRef);

    /** Para la tarea de expirados (WebhookBot): PENDING con expiresAt anterior a time. */
    List<Contribution> findByStatusAndExpiresAtBefore(ContributionStatus status, Instant time);

    long countByGoalIdAndStatus(Long goalId, ContributionStatus status);

    List<Contribution> findByGoalIdAndStatusOrderByPaidAtDesc(Long goalId, ContributionStatus status, Pageable pageable);
}
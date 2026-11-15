package com.pey.meta.webhook.job;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;

/**
 * Cada minuto marca EXPIRED las aportaciones PENDING cuyo QR ya vencio.
 * Si despues llega el pago de una de ellas, el webhook la marca PAID igual.
 */
@Component
public class ContributionExpirationJob {

    private static final Logger log = LoggerFactory.getLogger(ContributionExpirationJob.class);

    private final ContributionRepository contributionRepository;
    private final EntityManager entityManager;
    private final Clock clock;

    @Autowired
    public ContributionExpirationJob(ContributionRepository contributionRepository, EntityManager entityManager) {
        this(contributionRepository, entityManager, Clock.systemUTC());
    }

    ContributionExpirationJob(ContributionRepository contributionRepository, EntityManager entityManager, Clock clock) {
        this.contributionRepository = contributionRepository;
        this.entityManager = entityManager;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${webhook.expiration-job.delay-ms:60000}",
            initialDelayString = "${webhook.expiration-job.initial-delay-ms:60000}")
    @Transactional
    public void run() {
        expireOverdue();
    }

    /** @return cuantas aportaciones se marcaron EXPIRED. */
    int expireOverdue() {
        Instant now = clock.instant();
        List<Contribution> overdue = contributionRepository.findByStatusAndExpiresAtBefore(ContributionStatus.PENDING, now);
        int expired = 0;
        for (Contribution contribution : overdue) {
            // Bloquea y recarga: si el webhook la acaba de pagar, no se pisa el PAID.
            entityManager.refresh(contribution, LockModeType.PESSIMISTIC_WRITE);
            if (contribution.getStatus() != ContributionStatus.PENDING) {
                continue;
            }
            contribution.setStatus(ContributionStatus.EXPIRED);
            expired++;
        }
        if (expired > 0) {
            log.info("Se marcaron {} aportaciones como EXPIRED", expired);
        }
        return expired;
    }
}
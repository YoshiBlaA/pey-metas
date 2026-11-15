package com.pey.meta.contribution.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;

public interface ContributionRepository extends JpaRepository<Contribution, Long> {

    Optional<Contribution> findByNumRef(String numRef);

    boolean existsByNumRef(String numRef);

    /** Para la tarea de expirados (WebhookBot): PENDING con expiresAt anterior a time. */
    List<Contribution> findByStatusAndExpiresAtBefore(ContributionStatus status, Instant time);

    long countByGoalIdAndStatus(Long goalId, ContributionStatus status);

    List<Contribution> findByGoalIdAndStatusOrderByPaidAtDesc(Long goalId, ContributionStatus status, Pageable pageable);

    /**
     * Lista para el admin (mas nuevas primero) con la meta ya cargada. Filtros opcionales por meta y por
     * estado efectivo: un PENDING cuyo expiresAt ya paso cuenta como EXPIRED.
     */
    @Query("""
            select c from Contribution c join fetch c.goal g
            where g.ownerId = :ownerId
              and (:goalId is null or g.id = :goalId)
              and (:anyStatus = true
                   or (:paid = true and c.status = com.pey.meta.contribution.entity.ContributionStatus.PAID)
                   or (:pending = true and c.status = com.pey.meta.contribution.entity.ContributionStatus.PENDING and c.expiresAt > :now)
                   or (:expired = true and (c.status = com.pey.meta.contribution.entity.ContributionStatus.EXPIRED
                        or (c.status = com.pey.meta.contribution.entity.ContributionStatus.PENDING and c.expiresAt <= :now))))
            order by c.createdAt desc, c.id desc
            """)
    List<Contribution> searchForAdmin(@Param("ownerId") Long ownerId, @Param("goalId") Long goalId, @Param("anyStatus") boolean anyStatus,
                                      @Param("paid") boolean paid, @Param("pending") boolean pending,
                                      @Param("expired") boolean expired, @Param("now") Instant now,
                                      Pageable pageable);

    /** PENDING todavia vigentes (expiresAt despues de now); solo metas del admin ownerId, goalId opcional. */
    @Query("""
            select count(c) from Contribution c
            where c.goal.ownerId = :ownerId
              and (:goalId is null or c.goal.id = :goalId)
              and c.status = com.pey.meta.contribution.entity.ContributionStatus.PENDING and c.expiresAt > :now
            """)
    long countActivePending(@Param("ownerId") Long ownerId, @Param("goalId") Long goalId, @Param("now") Instant now);

    /** EXPIRED en BD mas los PENDING ya vencidos; solo metas del admin ownerId, goalId opcional. */
    @Query("""
            select count(c) from Contribution c
            where c.goal.ownerId = :ownerId
              and (:goalId is null or c.goal.id = :goalId)
              and (c.status = com.pey.meta.contribution.entity.ContributionStatus.EXPIRED
                   or (c.status = com.pey.meta.contribution.entity.ContributionStatus.PENDING and c.expiresAt <= :now))
            """)
    long countEffectiveExpired(@Param("ownerId") Long ownerId, @Param("goalId") Long goalId, @Param("now") Instant now);

    /** Numero de PAID; solo metas del admin ownerId, goalId opcional. */
    @Query("""
            select count(c) from Contribution c
            where c.goal.ownerId = :ownerId
              and (:goalId is null or c.goal.id = :goalId)
              and c.status = com.pey.meta.contribution.entity.ContributionStatus.PAID
            """)
    long countPaid(@Param("ownerId") Long ownerId, @Param("goalId") Long goalId);

    /** Suma de lo pagado desde {@code since}; solo metas del admin ownerId, goalId opcional. Nunca regresa null. */
    @Query("""
            select coalesce(sum(c.amount), 0) from Contribution c
            where c.goal.ownerId = :ownerId
              and (:goalId is null or c.goal.id = :goalId)
              and c.status = com.pey.meta.contribution.entity.ContributionStatus.PAID and c.paidAt >= :since
            """)
    BigDecimal sumPaidSince(@Param("ownerId") Long ownerId, @Param("goalId") Long goalId, @Param("since") Instant since);
}

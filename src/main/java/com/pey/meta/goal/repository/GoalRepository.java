package com.pey.meta.goal.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.entity.GoalStatus;

public interface GoalRepository extends JpaRepository<Goal, Long> {

    /**
     * Lee la meta con bloqueo pesimista (SELECT ... FOR UPDATE). Dos pagos simultaneos a la misma meta
     * se forman uno detras del otro, asi ninguna suma se pierde. Usar solo dentro de una transaccion.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "10000"))
    @Query("select g from Goal g where g.id = :id")
    Optional<Goal> findByIdForUpdate(@Param("id") Long id);

    List<Goal> findAllByOrderByCreatedAtDesc();

    List<Goal> findByStatusOrderByCreatedAtDesc(GoalStatus status);
}
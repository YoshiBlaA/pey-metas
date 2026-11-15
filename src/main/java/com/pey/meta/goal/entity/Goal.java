package com.pey.meta.goal.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Meta de dinero con barra de progreso (contrato del modulo goal).
 * Los montos son MXN con 2 decimales. Los montos predeterminados viven en la tabla goal_preset_amounts.
 */
@Entity
@Table(name = "goals")
@Getter
@Setter
@NoArgsConstructor
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "target_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "raised_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal raisedAmount = BigDecimal.ZERO;

    /** Se carga EAGER para que se pueda leer fuera de una transaccion (open-in-view esta apagado). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "goal_preset_amounts", joinColumns = @JoinColumn(name = "goal_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private List<BigDecimal> presetAmounts = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GoalStatus status = GoalStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (raisedAmount == null) {
            raisedAmount = BigDecimal.ZERO;
        }
        if (status == null) {
            status = GoalStatus.OPEN;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /** Reemplaza los montos predeterminados sin cambiar la instancia de la coleccion (lo que Hibernate prefiere). */
    public void replacePresetAmounts(List<BigDecimal> amounts) {
        presetAmounts.clear();
        if (amounts != null) {
            presetAmounts.addAll(amounts);
        }
    }

    /** true si lo recaudado ya llego o paso la meta. */
    public boolean isTargetReached() {
        return raisedAmount != null && targetAmount != null && raisedAmount.compareTo(targetAmount) >= 0;
    }
}
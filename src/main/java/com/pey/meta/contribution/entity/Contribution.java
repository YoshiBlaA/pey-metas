package com.pey.meta.contribution.entity;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.pey.meta.goal.entity.Goal;

/**
 * Aportacion a una meta, cobrada con un QR de CoDi creado en Pey.
 * Se amarra al webhook de Pey por {@code numRef} (el webhook no trae el nombre del pagador).
 */
@Entity
@Table(name = "contributions",
        uniqueConstraints = @UniqueConstraint(name = "uk_contributions_num_ref", columnNames = "num_ref"),
        indexes = {
                @Index(name = "idx_contributions_goal_status", columnList = "goal_id, status"),
                @Index(name = "idx_contributions_status_expires", columnList = "status, expires_at")
        })
@Getter
@Setter
@NoArgsConstructor
public class Contribution {

    public static final int MAX_DISPLAY_NAME = 60;
    public static final int MAX_MESSAGE = 200;
    /** Pey exige numRef numerico de 1 a 7 digitos (patron ^[0-9]{1,7}$). */
    public static final int NUM_REF_MAX_LENGTH = 7;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(name = "display_name", length = MAX_DISPLAY_NAME)
    private String displayName;

    @Column(nullable = false)
    private boolean anonymous;

    @Column(length = MAX_MESSAGE)
    private String message;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "num_ref", nullable = false, length = NUM_REF_MAX_LENGTH)
    private String numRef;

    /** Campo "id" de la respuesta de Pey: IDC del QR asignado por Banxico. Es el codiQrId del webhook. */
    @Column(name = "codi_qr_id", length = 64)
    private String codiQrId;

    /** Campo "qrString" de la respuesta de Pey: payload para dibujar el QR. */
    @Column(name = "qr_string", length = 2000)
    private String qrString;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ContributionStatus status = ContributionStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "transaction_id", length = 64)
    private String transactionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = ContributionStatus.PENDING;
        }
    }
}
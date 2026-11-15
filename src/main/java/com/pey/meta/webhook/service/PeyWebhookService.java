package com.pey.meta.webhook.service;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.service.GoalService;
import com.pey.meta.webhook.dto.PeyWebhookRequest;

/**
 * Atiende los avisos de Pey. Idempotente: un pago se cuenta una sola vez aunque Pey repita el aviso.
 */
@Service
public class PeyWebhookService {

    private static final Logger log = LoggerFactory.getLogger(PeyWebhookService.class);

    private final ContributionRepository contributionRepository;
    private final GoalService goalService;
    private final EntityManager entityManager;

    public PeyWebhookService(ContributionRepository contributionRepository,
                             GoalService goalService,
                             EntityManager entityManager) {
        this.contributionRepository = contributionRepository;
        this.goalService = goalService;
        this.entityManager = entityManager;
    }

    /**
     * Procesa un aviso en una sola transaccion. Si algo truena (por ejemplo la BD), se hace rollback
     * y el controller responde 5xx para que Pey reintente.
     */
    @Transactional
    public WebhookResult handle(PeyWebhookRequest event) {
        if (event == null || !PeyWebhookRequest.TYPE_QR_PAYMENT_RECEIVED.equals(event.type())) {
            log.info("Webhook de Pey ignorado: tipo de evento {}", event == null ? null : event.type());
            return WebhookResult.IGNORED_EVENT;
        }
        String numRef = event.numRef() == null ? null : event.numRef().trim();
        if (numRef == null || numRef.isEmpty()) {
            log.warn("Webhook de pago sin numRef (transactionId={}, amount={}); se ignora", event.transactionId(), event.amount());
            return WebhookResult.INVALID_PAYLOAD;
        }
        if (event.amount() == null || event.amount().signum() <= 0) {
            log.warn("Webhook de pago con monto invalido {} para numRef {} (transactionId={}); se ignora",
                    event.amount(), numRef, event.transactionId());
            return WebhookResult.INVALID_PAYLOAD;
        }

        Optional<Contribution> found = contributionRepository.findByNumRef(numRef);
        if (found.isEmpty()) {
            log.warn("Pago recibido para numRef desconocido {} (transactionId={}, codiQrId={}, amount={}); no se registra",
                    numRef, event.transactionId(), event.codiQrId(), event.amount());
            return WebhookResult.UNKNOWN_NUM_REF;
        }

        Contribution contribution = found.get();
        // Bloquea la fila (SELECT ... FOR UPDATE) y recarga su estado: si llegan dos avisos iguales al mismo
        // tiempo, o corre la tarea de expiracion, el segundo espera y ya ve el estado final.
        entityManager.refresh(contribution, LockModeType.PESSIMISTIC_WRITE);

        if (contribution.getStatus() == ContributionStatus.PAID) {
            if (event.transactionId() != null && contribution.getTransactionId() != null
                    && !event.transactionId().equals(contribution.getTransactionId())) {
                log.warn("numRef {} ya estaba PAID con transactionId {} y llego otro pago con transactionId {} (amount={}); "
                                + "no se suma, revisar en Pey",
                        numRef, contribution.getTransactionId(), event.transactionId(), event.amount());
            } else {
                log.info("Webhook repetido para numRef {} (transactionId={}): ya estaba PAID, no se cuenta de nuevo",
                        numRef, event.transactionId());
            }
            return WebhookResult.DUPLICATE;
        }

        if (contribution.getAmount() != null && contribution.getAmount().compareTo(event.amount()) != 0) {
            log.warn("Monto distinto para numRef {}: esperado {}, pagado {}; se registra el monto que reporta Pey",
                    numRef, contribution.getAmount(), event.amount());
        }
        if (contribution.getStatus() == ContributionStatus.EXPIRED) {
            log.info("Pago para numRef {} llego con la aportacion EXPIRED; se marca PAID porque el dinero ya se cobro", numRef);
        }
        if (event.codiQrId() != null && contribution.getCodiQrId() != null
                && !Objects.equals(contribution.getCodiQrId(), event.codiQrId())) {
            log.warn("codiQrId distinto para numRef {}: guardado {}, webhook {}; se guarda el del webhook",
                    numRef, contribution.getCodiQrId(), event.codiQrId());
        }

        contribution.setStatus(ContributionStatus.PAID);
        contribution.setPaidAt(toInstant(event.datePaid(), numRef));
        contribution.setTransactionId(event.transactionId());
        if (event.codiQrId() != null) {
            contribution.setCodiQrId(event.codiQrId());
        }
        contributionRepository.save(contribution);

        Long goalId = contribution.getGoal().getId();
        goalService.registerPayment(goalId, event.amount());

        log.info("Aviso recibido, anotado: numRef {} pagado por {} (transactionId={}, meta {})",
                numRef, event.amount(), event.transactionId(), goalId);
        return WebhookResult.PROCESSED;
    }

    private static Instant toInstant(Long epochSeconds, String numRef) {
        if (epochSeconds == null) {
            log.warn("Webhook sin datePaid para numRef {}; se usa la hora actual", numRef);
            return Instant.now();
        }
        return Instant.ofEpochSecond(epochSeconds);
    }
}
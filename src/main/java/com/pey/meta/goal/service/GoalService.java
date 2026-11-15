package com.pey.meta.goal.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.common.BusinessException;
import com.pey.meta.common.NotFoundException;
import com.pey.meta.goal.dto.GoalMapper;
import com.pey.meta.goal.dto.GoalPublicDetailResponse;
import com.pey.meta.goal.dto.GoalRequest;
import com.pey.meta.goal.dto.RecentContributionResponse;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.entity.GoalStatus;
import com.pey.meta.goal.repository.GoalRepository;

/**
 * Reglas de negocio de las metas.
 * Contrato para otros modulos: {@link #getOpenGoalOrThrow(Long)} y {@link #registerPayment(Long, BigDecimal)}.
 */
@Service
public class GoalService {

    private static final Logger log = LoggerFactory.getLogger(GoalService.class);

    public static final int DEFAULT_RECENT_LIMIT = 10;
    public static final int MAX_RECENT_LIMIT = 50;

    private final GoalRepository goalRepository;
    private final ObjectProvider<PaidContributionsProvider> paidContributionsProvider;

    public GoalService(GoalRepository goalRepository,
                       ObjectProvider<PaidContributionsProvider> paidContributionsProvider) {
        this.goalRepository = goalRepository;
        this.paidContributionsProvider = paidContributionsProvider;
    }

    // ---------------------------------------------------------------- contrato

    /**
     * Regresa la meta si existe y esta OPEN.
     * @throws NotFoundException (404) si no existe
     * @throws BusinessException (409) si esta cerrada
     */
    @Transactional(readOnly = true)
    public Goal getOpenGoalOrThrow(Long goalId) {
        Goal goal = getGoalOrThrow(goalId);
        if (goal.getStatus() != GoalStatus.OPEN) {
            throw BusinessException.conflict("La meta " + goalId + " est\u00e1 cerrada y ya no acepta aportaciones");
        }
        return goal;
    }

    /**
     * Suma un pago confirmado a la meta y la cierra si llega o pasa targetAmount.
     * Usa bloqueo pesimista sobre la fila de la meta, asi dos pagos simultaneos no se pisan.
     * Si la meta ya estaba cerrada (un QR creado antes del cierre que se pago despues) el dinero igual
     * se suma, porque ya se cobro; la meta sigue CLOSED.
     * @throws BusinessException (422) si el monto es nulo o no es mayor a 0
     * @throws NotFoundException (404) si la meta no existe
     */
    @Transactional
    public Goal registerPayment(Long goalId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("El monto del pago debe ser mayor a 0");
        }
        Goal goal = goalRepository.findByIdForUpdate(goalId)
                .orElseThrow(() -> new NotFoundException("Meta", goalId));

        goal.setRaisedAmount(goal.getRaisedAmount().add(amount));
        if (goal.getStatus() == GoalStatus.OPEN && goal.isTargetReached()) {
            goal.setStatus(GoalStatus.CLOSED);
            log.info("Meta {} alcanzada: {} de {}. Se cierra.", goalId, goal.getRaisedAmount(), goal.getTargetAmount());
        } else if (goal.getStatus() == GoalStatus.CLOSED) {
            log.warn("Pago de {} registrado en la meta {} que ya estaba cerrada", amount, goalId);
        }
        return goal;
    }

    // ---------------------------------------------------------------- admin

    @Transactional
    public Goal create(GoalRequest request) {
        Goal goal = new Goal();
        goal.setRaisedAmount(BigDecimal.ZERO);
        goal.setStatus(GoalStatus.OPEN);
        apply(goal, request);
        return goalRepository.save(goal);
    }

    /** Lista todas las metas (mas nuevas primero); si status no es nulo, solo las de ese estado. */
    @Transactional(readOnly = true)
    public List<Goal> list(GoalStatus status) {
        return status == null
                ? goalRepository.findAllByOrderByCreatedAtDesc()
                : goalRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    @Transactional(readOnly = true)
    public Goal getGoalOrThrow(Long goalId) {
        return goalRepository.findById(goalId)
                .orElseThrow(() -> new NotFoundException("Meta", goalId));
    }

    /**
     * Edita titulo, descripcion, meta y montos predeterminados. Si con la nueva meta lo recaudado ya alcanza,
     * la meta se cierra. Si estaba cerrada y la nueva meta queda arriba de lo recaudado, sigue cerrada
     * hasta que el admin la reabra.
     */
    @Transactional
    public Goal update(Long goalId, GoalRequest request) {
        Goal goal = goalRepository.findByIdForUpdate(goalId)
                .orElseThrow(() -> new NotFoundException("Meta", goalId));
        apply(goal, request);
        if (goal.getStatus() == GoalStatus.OPEN && goal.isTargetReached()) {
            goal.setStatus(GoalStatus.CLOSED);
        }
        return goal;
    }

    /** Cierra la meta. Si ya estaba cerrada no pasa nada. */
    @Transactional
    public Goal close(Long goalId) {
        Goal goal = goalRepository.findByIdForUpdate(goalId)
                .orElseThrow(() -> new NotFoundException("Meta", goalId));
        goal.setStatus(GoalStatus.CLOSED);
        return goal;
    }

    /**
     * Reabre la meta. No se puede si lo recaudado ya alcanza la meta: primero hay que subir targetAmount.
     */
    @Transactional
    public Goal reopen(Long goalId) {
        Goal goal = goalRepository.findByIdForUpdate(goalId)
                .orElseThrow(() -> new NotFoundException("Meta", goalId));
        if (goal.isTargetReached()) {
            throw new BusinessException("No se puede reabrir: lo recaudado ya alcanza la meta. Sube la meta primero.");
        }
        goal.setStatus(GoalStatus.OPEN);
        return goal;
    }

    // ---------------------------------------------------------------- publico

    @Transactional(readOnly = true)
    public GoalPublicDetailResponse getPublicDetail(Long goalId, int recentLimit) {
        Goal goal = getGoalOrThrow(goalId);
        int limit = Math.max(1, Math.min(recentLimit, MAX_RECENT_LIMIT));

        long paidCount = 0;
        List<RecentContributionResponse> recent = List.of();
        PaidContributionsProvider provider = paidContributionsProvider.getIfAvailable();
        if (provider != null) {
            paidCount = provider.countPaid(goalId);
            recent = provider.findLatestPaid(goalId, limit).stream()
                    .map(GoalMapper::toRecent)
                    .toList();
        }
        return GoalMapper.toPublicDetail(goal, paidCount, recent);
    }

    // ---------------------------------------------------------------- apoyo

    private void apply(Goal goal, GoalRequest request) {
        goal.setTitle(request.title().trim());
        String description = request.description();
        goal.setDescription(description == null || description.isBlank() ? null : description.trim());
        goal.setOrganizer(blankToNull(request.organizer()));
        goal.setCity(blankToNull(request.city()));
        goal.setTargetAmount(request.targetAmount().setScale(2, RoundingMode.HALF_UP));
        goal.replacePresetAmounts(normalizePresets(request.presetAmounts()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Escala a 2 decimales, quita repetidos y ordena de menor a mayor. */
    static List<BigDecimal> normalizePresets(List<BigDecimal> amounts) {
        if (amounts == null) {
            return List.of();
        }
        return amounts.stream()
                .map(a -> a.setScale(2, RoundingMode.HALF_UP))
                .distinct()
                .sorted()
                .toList();
    }
}
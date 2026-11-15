package com.pey.meta.contribution.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.common.BusinessException;
import com.pey.meta.common.NotFoundException;
import com.pey.meta.contribution.client.PeyClient;
import com.pey.meta.contribution.client.PeyCreateQrRequest;
import com.pey.meta.contribution.client.PeyQrResponse;
import com.pey.meta.contribution.dto.ContributionCreatedResponse;
import com.pey.meta.contribution.dto.ContributionMapper;
import com.pey.meta.contribution.dto.ContributionStatusResponse;
import com.pey.meta.contribution.dto.CreateContributionRequest;
import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.service.GoalService;

/**
 * Crea aportaciones con su QR de CoDi en Pey y reporta su estado.
 *
 * Orden: 1) se guarda la aportacion PENDING (reserva el numRef con la restriccion unica en BD),
 * 2) se llama a Pey fuera de cualquier transaccion, 3) se guardan los datos del QR.
 * Asi nunca existe en Pey un QR cuyo numRef no este en nuestra BD (el webhook siempre encuentra a quien pago).
 * Si Pey falla, la fila se marca EXPIRED con expiresAt = ahora (nunca se mostro un QR al pagador).
 */
@Service
public class ContributionService {

    private static final Logger log = LoggerFactory.getLogger(ContributionService.class);

    static final String CONCEPT_PREFIX = "Aportaci\u00f3n meta ";
    /**
     * La doc de Pey no fija un limite para concept. Se usa 40 caracteres ASCII (limite habitual del concepto
     * en CoDi/SPEI) para no arriesgar un 400; acentos y caracteres no ASCII se quitan.
     */
    static final int CONCEPT_MAX_LENGTH = 40;
    static final int NUM_REF_MAX_ATTEMPTS = 10;
    /** Pey: expiration minima (si no es 0) de 360 segundos. */
    static final int MIN_PEY_EXPIRATION_SECONDS = 360;
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
    private static final String NUM_REF_PATTERN = "\\d{1," + Contribution.NUM_REF_MAX_LENGTH + "}";

    private final ContributionRepository contributionRepository;
    private final GoalService goalService;
    private final PeyClient peyClient;
    private final NumRefGenerator numRefGenerator;
    private final int expirationSeconds;
    private final boolean generateImage;
    private final Clock clock;

    @Autowired
    public ContributionService(ContributionRepository contributionRepository,
                               GoalService goalService,
                               PeyClient peyClient,
                               NumRefGenerator numRefGenerator,
                               @Value("${pey.qr-expiration-seconds:${QR_EXPIRATION_SECONDS:1200}}") int expirationSeconds,
                               @Value("${pey.generate-image:${PEY_GENERATE_IMAGE:false}}") boolean generateImage) {
        this(contributionRepository, goalService, peyClient, numRefGenerator, expirationSeconds, generateImage,
                Clock.systemUTC());
    }

    ContributionService(ContributionRepository contributionRepository, GoalService goalService, PeyClient peyClient,
                        NumRefGenerator numRefGenerator, int expirationSeconds, boolean generateImage, Clock clock) {
        if (expirationSeconds < MIN_PEY_EXPIRATION_SECONDS) {
            throw new IllegalArgumentException("pey.qr-expiration-seconds debe ser al menos "
                    + MIN_PEY_EXPIRATION_SECONDS + " (m\u00ednimo de Pey); valor: " + expirationSeconds);
        }
        this.contributionRepository = contributionRepository;
        this.goalService = goalService;
        this.peyClient = peyClient;
        this.numRefGenerator = numRefGenerator;
        this.expirationSeconds = expirationSeconds;
        this.generateImage = generateImage;
        this.clock = clock;
    }

    /**
     * Crea la aportacion PENDING y su QR en Pey.
     * @throws BusinessException 422 por datos invalidos, 409 si la meta esta cerrada
     * @throws NotFoundException 404 si la meta no existe
     * @throws com.pey.meta.contribution.exception.PeyApiException si Pey falla (502)
     */
    public ContributionCreatedResponse create(Long goalId, CreateContributionRequest request) {
        if (request == null) {
            throw new BusinessException("Faltan los datos de la aportaci\u00f3n");
        }
        BigDecimal amount = validateAmount(request.amount());
        boolean anonymous = Boolean.TRUE.equals(request.anonymous());
        String displayName = validateDisplayName(request.displayName(), anonymous);
        String message = validateMessage(request.message());

        Goal goal = goalService.getOpenGoalOrThrow(goalId);

        Instant requestedAt = clock.instant();
        Contribution contribution = reserve(goal, amount, displayName, anonymous, message,
                requestedAt.plusSeconds(expirationSeconds));

        PeyQrResponse qr;
        try {
            qr = peyClient.createQr(new PeyCreateQrRequest(amount, buildConcept(goal.getTitle()), expirationSeconds,
                    contribution.getNumRef(), generateImage ? Boolean.TRUE : null));
        } catch (RuntimeException ex) {
            markFailed(contribution);
            throw ex;
        }

        contribution.setCodiQrId(qr.id());
        contribution.setQrString(qr.qrString());
        Contribution saved = contributionRepository.save(contribution);
        log.info("Aportaci\u00f3n numRef={} meta={} monto={} creada con QR {}", saved.getNumRef(), goal.getId(),
                saved.getAmount(), saved.getCodiQrId());
        return ContributionMapper.toCreated(saved, goal.getId(), qr.qrImage());
    }

    /** Estado por numRef. Un PENDING cuyo expiresAt ya paso se reporta EXPIRED (el marcado en BD es de webhook). */
    @Transactional(readOnly = true)
    public ContributionStatusResponse getStatus(String numRef) {
        if (numRef == null || !numRef.matches(NUM_REF_PATTERN)) {
            throw new NotFoundException("Aportaci\u00f3n", numRef);
        }
        Contribution c = contributionRepository.findByNumRef(numRef)
                .orElseThrow(() -> new NotFoundException("Aportaci\u00f3n", numRef));
        return ContributionMapper.toStatus(c, effectiveStatus(c, clock.instant()));
    }

    static ContributionStatus effectiveStatus(Contribution c, Instant now) {
        if (c.getStatus() == ContributionStatus.PENDING && c.getExpiresAt() != null
                && !now.isBefore(c.getExpiresAt())) {
            return ContributionStatus.EXPIRED;
        }
        return c.getStatus();
    }

    /** "Aportacion meta {titulo}" en ASCII, recortado a CONCEPT_MAX_LENGTH. */
    static String buildConcept(String title) {
        String raw = CONCEPT_PREFIX + (title == null ? "" : title.trim());
        String ascii = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\x20-\\x7E]", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (ascii.length() <= CONCEPT_MAX_LENGTH) {
            return ascii;
        }
        return ascii.substring(0, CONCEPT_MAX_LENGTH).trim();
    }

    // ---------------------------------------------------------------- apoyo

    private Contribution reserve(Goal goal, BigDecimal amount, String displayName, boolean anonymous,
                                 String message, Instant expiresAt) {
        for (int attempt = 1; attempt <= NUM_REF_MAX_ATTEMPTS; attempt++) {
            String numRef = numRefGenerator.next();
            if (contributionRepository.existsByNumRef(numRef)) {
                continue;
            }
            Contribution c = new Contribution();
            c.setGoal(goal);
            c.setAmount(amount);
            c.setDisplayName(displayName);
            c.setAnonymous(anonymous);
            c.setMessage(message);
            c.setNumRef(numRef);
            c.setStatus(ContributionStatus.PENDING);
            c.setExpiresAt(expiresAt);
            try {
                return contributionRepository.saveAndFlush(c);
            } catch (DataIntegrityViolationException ex) {
                log.warn("numRef {} choc\u00f3 al guardar (intento {}), se reintenta", numRef, attempt);
            }
        }
        throw new BusinessException("No se pudo generar una referencia \u00fanica, intenta de nuevo",
                HttpStatus.SERVICE_UNAVAILABLE);
    }

    private void markFailed(Contribution c) {
        try {
            c.setStatus(ContributionStatus.EXPIRED);
            c.setExpiresAt(clock.instant());
            contributionRepository.save(c);
        } catch (RuntimeException ex) {
            log.error("No se pudo marcar como EXPIRED la aportaci\u00f3n numRef={} tras fallo de Pey", c.getNumRef(), ex);
        }
    }

    private static BigDecimal validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new BusinessException("El monto es obligatorio");
        }
        if (amount.signum() <= 0) {
            throw new BusinessException("El monto debe ser mayor a 0");
        }
        if (amount.stripTrailingZeros().scale() > 2) {
            throw new BusinessException("El monto admite m\u00e1ximo 2 decimales");
        }
        if (amount.compareTo(MAX_AMOUNT) > 0) {
            throw new BusinessException("El monto es demasiado grande");
        }
        return amount.setScale(2, RoundingMode.UNNECESSARY);
    }

    private static String validateDisplayName(String displayName, boolean anonymous) {
        String name = blankToNull(displayName);
        if (name == null && !anonymous) {
            throw new BusinessException("El nombre o apodo es obligatorio si no pagas como an\u00f3nimo");
        }
        if (name != null && name.length() > Contribution.MAX_DISPLAY_NAME) {
            throw new BusinessException("El nombre admite m\u00e1ximo " + Contribution.MAX_DISPLAY_NAME + " caracteres");
        }
        return name;
    }

    private static String validateMessage(String message) {
        String msg = blankToNull(message);
        if (msg != null && msg.length() > Contribution.MAX_MESSAGE) {
            throw new BusinessException("El mensaje admite m\u00e1ximo " + Contribution.MAX_MESSAGE + " caracteres");
        }
        return msg;
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String trimmed = s.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
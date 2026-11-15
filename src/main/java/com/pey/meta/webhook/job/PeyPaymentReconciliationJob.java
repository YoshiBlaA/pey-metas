package com.pey.meta.webhook.job;

import java.time.Clock;
import java.time.Duration;
import java.util.EnumSet;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.pey.meta.contribution.client.PeyClient;
import com.pey.meta.contribution.client.PeyQrTransactionsResponse;
import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.webhook.dto.PeyWebhookRequest;
import com.pey.meta.webhook.service.PeyWebhookService;
import com.pey.meta.webhook.service.WebhookResult;

/**
 * Respaldo del webhook: cada minuto consulta en Pey los QR de las aportaciones de las ultimas 24 h que
 * siguen PENDING o EXPIRED. Si Pey ya los tiene PAID, registra el pago con el mismo servicio del webhook
 * (idempotente: si el webhook llega despues, no se cuenta dos veces).
 * Se apaga con pey.reconcile.enabled=false (PEY_RECONCILE_ENABLED).
 */
@Component
public class PeyPaymentReconciliationJob {

    private static final Logger log = LoggerFactory.getLogger(PeyPaymentReconciliationJob.class);
    static final Duration WINDOW = Duration.ofHours(24);

    private final ContributionRepository contributionRepository;
    private final PeyClient peyClient;
    private final PeyWebhookService webhookService;
    private final boolean enabled;
    private final Clock clock;

    @Autowired
    public PeyPaymentReconciliationJob(ContributionRepository contributionRepository, PeyClient peyClient,
                                       PeyWebhookService webhookService,
                                       @Value("${pey.reconcile.enabled:${PEY_RECONCILE_ENABLED:true}}") boolean enabled) {
        this(contributionRepository, peyClient, webhookService, enabled, Clock.systemUTC());
    }

    PeyPaymentReconciliationJob(ContributionRepository contributionRepository, PeyClient peyClient,
                                PeyWebhookService webhookService, boolean enabled, Clock clock) {
        this.contributionRepository = contributionRepository;
        this.peyClient = peyClient;
        this.webhookService = webhookService;
        this.enabled = enabled;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${pey.reconcile.delay-ms:${PEY_RECONCILE_DELAY_MS:60000}}",
            initialDelayString = "${pey.reconcile.initial-delay-ms:30000}")
    public void run() {
        if (enabled) {
            reconcile();
        }
    }

    /** @return cuantos pagos se registraron en esta pasada. */
    int reconcile() {
        List<Contribution> candidates = contributionRepository
                .findTop50ByStatusInAndCodiQrIdIsNotNullAndCreatedAtAfterOrderByCreatedAtAsc(
                        EnumSet.of(ContributionStatus.PENDING, ContributionStatus.EXPIRED), clock.instant().minus(WINDOW));
        int registered = 0;
        for (Contribution c : candidates) {
            try {
                PeyQrTransactionsResponse.Item paid = peyClient.getQrTransactions(c.getCodiQrId()).stream()
                        .filter(PeyQrTransactionsResponse.Item::isPaid)
                        .findFirst().orElse(null);
                if (paid == null) {
                    continue;
                }
                PeyWebhookRequest event = new PeyWebhookRequest(
                        paid.amount() != null ? paid.amount() : c.getAmount(), null, c.getCodiQrId(), null,
                        paid.datePaid(), c.getNumRef(), paid.id(), PeyWebhookRequest.TYPE_QR_PAYMENT_RECEIVED);
                if (webhookService.handle(event) == WebhookResult.PROCESSED) {
                    registered++;
                    log.info("Conciliación: pago de numRef {} encontrado en Pey sin webhook; registrado", c.getNumRef());
                }
            } catch (RuntimeException ex) {
                log.warn("Conciliación: no se pudo revisar numRef {} (QR {}): {}", c.getNumRef(), c.getCodiQrId(), ex.getMessage());
            }
        }
        return registered;
    }
}

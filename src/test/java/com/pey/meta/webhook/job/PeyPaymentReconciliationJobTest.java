package com.pey.meta.webhook.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.pey.meta.contribution.client.PeyClient;
import com.pey.meta.contribution.client.PeyQrTransactionsResponse.Item;
import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.exception.PeyApiException;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.webhook.dto.PeyWebhookRequest;
import com.pey.meta.webhook.service.PeyWebhookService;
import com.pey.meta.webhook.service.WebhookResult;

class PeyPaymentReconciliationJobTest {

    private final ContributionRepository repo = mock(ContributionRepository.class);
    private final PeyClient pey = mock(PeyClient.class);
    private final PeyWebhookService webhook = mock(PeyWebhookService.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-15T22:10:00Z"), ZoneOffset.UTC);
    private final PeyPaymentReconciliationJob job = new PeyPaymentReconciliationJob(repo, pey, webhook, true, clock);

    private static Contribution contribution(String numRef, String qr) {
        Contribution c = new Contribution();
        c.setNumRef(numRef);
        c.setCodiQrId(qr);
        c.setAmount(new BigDecimal("0.01"));
        c.setStatus(ContributionStatus.PENDING);
        return c;
    }

    @Test
    void registraElPagoQueEstaEnPeyComoSiFueraElWebhook() {
        when(repo.findTop50ByStatusInAndCodiQrIdIsNotNullAndCreatedAtAfterOrderByCreatedAtAsc(anyCollection(), any()))
                .thenReturn(List.of(contribution("9823955", "351420196d"), contribution("1111111", "aaa")));
        when(pey.getQrTransactions("351420196d")).thenReturn(List.of(new Item("TX1", "PAID", new BigDecimal("0.01"), 1794780519L)));
        when(pey.getQrTransactions("aaa")).thenReturn(List.of(new Item("TX2", "PENDING", new BigDecimal("0.01"), null)));
        when(webhook.handle(any())).thenReturn(WebhookResult.PROCESSED);

        assertThat(job.reconcile()).isEqualTo(1);

        ArgumentCaptor<PeyWebhookRequest> sent = ArgumentCaptor.forClass(PeyWebhookRequest.class);
        verify(webhook).handle(sent.capture());
        assertThat(sent.getValue().numRef()).isEqualTo("9823955");
        assertThat(sent.getValue().transactionId()).isEqualTo("TX1");
        assertThat(sent.getValue().datePaid()).isEqualTo(1794780519L);
        assertThat(sent.getValue().type()).isEqualTo(PeyWebhookRequest.TYPE_QR_PAYMENT_RECEIVED);
    }

    @Test
    void siPeyFallaSigueConLasDemasYNoRegistraNada() {
        when(repo.findTop50ByStatusInAndCodiQrIdIsNotNullAndCreatedAtAfterOrderByCreatedAtAsc(anyCollection(), any()))
                .thenReturn(List.of(contribution("1", "q1")));
        when(pey.getQrTransactions("q1")).thenThrow(new PeyApiException("caido"));

        assertThat(job.reconcile()).isZero();
        verify(webhook, never()).handle(any());
    }

    @Test
    void apagadoNoConsultaNada() {
        new PeyPaymentReconciliationJob(repo, pey, webhook, false, clock).run();
        verify(repo, never()).findTop50ByStatusInAndCodiQrIdIsNotNullAndCreatedAtAfterOrderByCreatedAtAsc(anyCollection(), any());
    }
}

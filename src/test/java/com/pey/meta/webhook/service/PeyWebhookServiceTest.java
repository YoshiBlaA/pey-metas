package com.pey.meta.webhook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.service.GoalService;
import com.pey.meta.webhook.dto.PeyWebhookRequest;

@ExtendWith(MockitoExtension.class)
class PeyWebhookServiceTest {

    private static final String TYPE = PeyWebhookRequest.TYPE_QR_PAYMENT_RECEIVED;
    private static final long DATE_PAID = 1790724818L;

    @Mock
    private ContributionRepository contributionRepository;
    @Mock
    private GoalService goalService;
    @Mock
    private EntityManager entityManager;

    private PeyWebhookService service;

    @BeforeEach
    void setUp() {
        service = new PeyWebhookService(contributionRepository, goalService, entityManager);
    }

    private static Contribution contribution(ContributionStatus status) {
        Goal goal = new Goal();
        goal.setId(7L);
        Contribution c = new Contribution();
        c.setId(1L);
        c.setGoal(goal);
        c.setAmount(new BigDecimal("150.00"));
        c.setNumRef("1234567");
        c.setCodiQrId("QR1");
        c.setStatus(status);
        c.setExpiresAt(Instant.now().plusSeconds(600));
        return c;
    }

    private static PeyWebhookRequest event(String amount, String numRef, String transactionId, String type) {
        return new PeyWebhookRequest(amount == null ? null : new BigDecimal(amount), "KEY", "QR1", "Aportacion",
                DATE_PAID, numRef, transactionId, type);
    }

    @Test
    void pagoNormalMarcaPaidYSumaALaMeta() {
        Contribution c = contribution(ContributionStatus.PENDING);
        when(contributionRepository.findByNumRef("1234567")).thenReturn(Optional.of(c));

        WebhookResult result = service.handle(event("150", "1234567", "TX1", TYPE));

        assertThat(result).isEqualTo(WebhookResult.PROCESSED);
        assertThat(c.getStatus()).isEqualTo(ContributionStatus.PAID);
        assertThat(c.getPaidAt()).isEqualTo(Instant.ofEpochSecond(DATE_PAID));
        assertThat(c.getTransactionId()).isEqualTo("TX1");
        assertThat(c.getCodiQrId()).isEqualTo("QR1");
        verify(entityManager).refresh(c, LockModeType.PESSIMISTIC_WRITE);
        verify(contributionRepository).save(c);
        verify(goalService).registerPayment(7L, new BigDecimal("150"));
    }

    @Test
    void webhookRepetidoNoSeCuentaDosVeces() {
        Contribution c = contribution(ContributionStatus.PENDING);
        when(contributionRepository.findByNumRef("1234567")).thenReturn(Optional.of(c));

        WebhookResult first = service.handle(event("150", "1234567", "TX1", TYPE));
        WebhookResult second = service.handle(event("150", "1234567", "TX1", TYPE));

        assertThat(first).isEqualTo(WebhookResult.PROCESSED);
        assertThat(second).isEqualTo(WebhookResult.DUPLICATE);
        verify(goalService, times(1)).registerPayment(any(), any());
        verify(contributionRepository, times(1)).save(any());
    }

    @Test
    void aportacionYaPagadaConOtraTransaccionNoSeSuma() {
        Contribution c = contribution(ContributionStatus.PAID);
        c.setTransactionId("TX1");
        when(contributionRepository.findByNumRef("1234567")).thenReturn(Optional.of(c));

        WebhookResult result = service.handle(event("150", "1234567", "TX2", TYPE));

        assertThat(result).isEqualTo(WebhookResult.DUPLICATE);
        assertThat(c.getTransactionId()).isEqualTo("TX1");
        verify(goalService, never()).registerPayment(any(), any());
        verify(contributionRepository, never()).save(any());
    }

    @Test
    void numRefDesconocidoSoloSeRegistraEnLog() {
        when(contributionRepository.findByNumRef("9999999")).thenReturn(Optional.empty());

        WebhookResult result = service.handle(event("150", "9999999", "TX1", TYPE));

        assertThat(result).isEqualTo(WebhookResult.UNKNOWN_NUM_REF);
        verifyNoInteractions(goalService, entityManager);
        verify(contributionRepository, never()).save(any());
    }

    @Test
    void pagoDeAportacionExpiradaSeMarcaPaidYSeSuma() {
        Contribution c = contribution(ContributionStatus.EXPIRED);
        when(contributionRepository.findByNumRef("1234567")).thenReturn(Optional.of(c));

        WebhookResult result = service.handle(event("150", "1234567", "TX1", TYPE));

        assertThat(result).isEqualTo(WebhookResult.PROCESSED);
        assertThat(c.getStatus()).isEqualTo(ContributionStatus.PAID);
        verify(goalService).registerPayment(7L, new BigDecimal("150"));
    }

    @Test
    void montoDistintoSeRegistraConElMontoDePey() {
        Contribution c = contribution(ContributionStatus.PENDING);
        when(contributionRepository.findByNumRef("1234567")).thenReturn(Optional.of(c));

        WebhookResult result = service.handle(event("100", "1234567", "TX1", TYPE));

        assertThat(result).isEqualTo(WebhookResult.PROCESSED);
        verify(goalService).registerPayment(7L, new BigDecimal("100"));
    }

    @Test
    void otroTipoDeEventoSeIgnora() {
        WebhookResult result = service.handle(event("150", "1234567", "TX1", "paymentlink.status_updated"));

        assertThat(result).isEqualTo(WebhookResult.IGNORED_EVENT);
        verifyNoInteractions(contributionRepository, goalService, entityManager);
    }

    @Test
    void sinMontoOSinNumRefSeIgnora() {
        assertThat(service.handle(event(null, "1234567", "TX1", TYPE))).isEqualTo(WebhookResult.INVALID_PAYLOAD);
        assertThat(service.handle(event("150", " ", "TX1", TYPE))).isEqualTo(WebhookResult.INVALID_PAYLOAD);
        verifyNoInteractions(contributionRepository, goalService, entityManager);
    }
}
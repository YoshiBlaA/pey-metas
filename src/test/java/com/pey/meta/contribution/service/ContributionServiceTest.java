package com.pey.meta.contribution.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import com.pey.meta.common.BusinessException;
import com.pey.meta.common.NotFoundException;
import com.pey.meta.contribution.client.PeyClient;
import com.pey.meta.contribution.client.PeyCreateQrRequest;
import com.pey.meta.contribution.client.PeyQrResponse;
import com.pey.meta.contribution.dto.ContributionCreatedResponse;
import com.pey.meta.contribution.dto.ContributionStatusResponse;
import com.pey.meta.contribution.dto.CreateContributionRequest;
import com.pey.meta.contribution.entity.Contribution;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.exception.PeyApiException;
import com.pey.meta.contribution.repository.ContributionRepository;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.entity.GoalStatus;
import com.pey.meta.goal.service.GoalService;

@ExtendWith(MockitoExtension.class)
class ContributionServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-15T16:00:00Z");

    @Mock
    private ContributionRepository repository;
    @Mock
    private GoalService goalService;
    @Mock
    private PeyClient peyClient;
    @Mock
    private NumRefGenerator numRefGenerator;

    private ContributionService service;

    @BeforeEach
    void setUp() {
        service = new ContributionService(repository, goalService, peyClient, numRefGenerator, 1200, false,
                Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(repository.saveAndFlush(any(Contribution.class))).thenAnswer(inv -> withId(inv.getArgument(0)));
        lenient().when(repository.save(any(Contribution.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Contribution withId(Contribution c) {
        if (c.getId() == null) {
            c.setId(10L);
        }
        return c;
    }

    private static Goal goal() {
        Goal g = new Goal();
        g.setId(1L);
        g.setTitle("Colecta");
        g.setTargetAmount(new BigDecimal("1000.00"));
        g.setRaisedAmount(BigDecimal.ZERO);
        g.setStatus(GoalStatus.OPEN);
        return g;
    }

    private void givenOpenGoalAndNumRef(String numRef) {
        when(goalService.getOpenGoalOrThrow(1L)).thenReturn(goal());
        when(numRefGenerator.next()).thenReturn(numRef);
        when(repository.existsByNumRef(numRef)).thenReturn(false);
    }

    @Test
    void createHappyPathCallsPeyAndSavesQr() {
        givenOpenGoalAndNumRef("1234567");
        when(peyClient.createQr(any())).thenReturn(new PeyQrResponse("AB12CD34EF", "{\"IDC\":\"AB12CD34EF\"}", null));

        ContributionCreatedResponse res = service.create(1L,
                new CreateContributionRequest(new BigDecimal("150.5"), "  Jairo ", false, "   "));

        ArgumentCaptor<PeyCreateQrRequest> peyReq = ArgumentCaptor.forClass(PeyCreateQrRequest.class);
        verify(peyClient).createQr(peyReq.capture());
        assertThat(peyReq.getValue().amount()).isEqualByComparingTo("150.50");
        assertThat(peyReq.getValue().amount().scale()).isEqualTo(2);
        assertThat(peyReq.getValue().concept()).isEqualTo("Aportacion meta Colecta");
        assertThat(peyReq.getValue().expiration()).isEqualTo(1200);
        assertThat(peyReq.getValue().numRef()).isEqualTo("1234567");
        assertThat(peyReq.getValue().generateImage()).isNull();

        ArgumentCaptor<Contribution> saved = ArgumentCaptor.forClass(Contribution.class);
        verify(repository).save(saved.capture());
        Contribution c = saved.getValue();
        assertThat(c.getStatus()).isEqualTo(ContributionStatus.PENDING);
        assertThat(c.getCodiQrId()).isEqualTo("AB12CD34EF");
        assertThat(c.getDisplayName()).isEqualTo("Jairo");
        assertThat(c.getMessage()).isNull();
        assertThat(c.isAnonymous()).isFalse();

        assertThat(res.numRef()).isEqualTo("1234567");
        assertThat(res.goalId()).isEqualTo(1L);
        assertThat(res.status()).isEqualTo(ContributionStatus.PENDING);
        assertThat(res.expiresAt()).isEqualTo(NOW.plusSeconds(1200));
        assertThat(res.codiQrId()).isEqualTo("AB12CD34EF");
        assertThat(res.qrString()).contains("AB12CD34EF");
        assertThat(res.qrImage()).isNull();
    }

    @Test
    void anonymousDoesNotNeedDisplayName() {
        givenOpenGoalAndNumRef("7654321");
        when(peyClient.createQr(any())).thenReturn(new PeyQrResponse("ID", "QR", null));

        ContributionCreatedResponse res = service.create(1L,
                new CreateContributionRequest(new BigDecimal("50"), null, true, "Suerte"));

        assertThat(res.amount()).isEqualByComparingTo("50.00");
        ArgumentCaptor<Contribution> saved = ArgumentCaptor.forClass(Contribution.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().isAnonymous()).isTrue();
        assertThat(saved.getValue().getDisplayName()).isNull();
        assertThat(saved.getValue().getMessage()).isEqualTo("Suerte");
    }

    @Test
    void closedGoalIsRejectedWithoutCallingPey() {
        when(goalService.getOpenGoalOrThrow(1L)).thenThrow(BusinessException.conflict("cerrada"));

        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "Ana", false, null)))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
        verifyNoInteractions(peyClient);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void missingGoalPropagatesNotFound() {
        when(goalService.getOpenGoalOrThrow(99L)).thenThrow(new NotFoundException("Meta", 99L));

        assertThatThrownBy(() -> service.create(99L,
                new CreateContributionRequest(new BigDecimal("10"), "Ana", false, null)))
                .isInstanceOf(NotFoundException.class);
        verifyNoInteractions(peyClient);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "0.00", "-5", "10.001", "10000000000.00"})
    void invalidAmountIsRejected(String amount) {
        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal(amount), "Ana", false, null)))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getStatus())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));
        verifyNoInteractions(goalService, peyClient);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void nullAmountIsRejected() {
        assertThatThrownBy(() -> service.create(1L, new CreateContributionRequest(null, "Ana", false, null)))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(goalService, peyClient);
    }

    @Test
    void displayNameRequiredWhenNotAnonymous() {
        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "  ", false, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("nombre");
        verifyNoInteractions(goalService, peyClient);
    }

    @Test
    void tooLongDisplayNameAndMessageAreRejected() {
        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "x".repeat(61), false, null)))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "Ana", false, "y".repeat(201))))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(goalService, peyClient);
    }

    @Test
    void peyErrorMarksContributionExpiredAndRethrows() {
        givenOpenGoalAndNumRef("1234567");
        when(peyClient.createQr(any())).thenThrow(
                new PeyApiException("Pey respondio HTTP 503", 503, "SERVICE_UNAVAILABLE", "req-1", null));

        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "Ana", false, null)))
                .isInstanceOf(PeyApiException.class);

        verify(repository).saveAndFlush(any(Contribution.class));
        ArgumentCaptor<Contribution> saved = ArgumentCaptor.forClass(Contribution.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(ContributionStatus.EXPIRED);
        assertThat(saved.getValue().getExpiresAt()).isEqualTo(NOW);
        assertThat(saved.getValue().getCodiQrId()).isNull();
    }

    @Test
    void numRefCollisionsAreRetried() {
        when(goalService.getOpenGoalOrThrow(1L)).thenReturn(goal());
        when(numRefGenerator.next()).thenReturn("1111111", "2222222", "3333333");
        when(repository.existsByNumRef("1111111")).thenReturn(true);
        when(repository.existsByNumRef("2222222")).thenReturn(false);
        when(repository.existsByNumRef("3333333")).thenReturn(false);
        when(repository.saveAndFlush(any(Contribution.class)))
                .thenThrow(new DataIntegrityViolationException("duplicado"))
                .thenAnswer(inv -> withId(inv.getArgument(0)));
        when(peyClient.createQr(any())).thenReturn(new PeyQrResponse("ID", "QR", null));

        ContributionCreatedResponse res = service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "Ana", false, null));

        assertThat(res.numRef()).isEqualTo("3333333");
    }

    @Test
    void givesUpAfterTooManyCollisions() {
        when(goalService.getOpenGoalOrThrow(1L)).thenReturn(goal());
        when(numRefGenerator.next()).thenReturn("1111111");
        when(repository.existsByNumRef("1111111")).thenReturn(true);

        assertThatThrownBy(() -> service.create(1L,
                new CreateContributionRequest(new BigDecimal("10"), "Ana", false, null)))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getStatus())
                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        verifyNoInteractions(peyClient);
    }

    @Test
    void conceptIsAsciiAndTruncated() {
        assertThat(ContributionService.buildConcept("Viaje a Canc\u00fan")).isEqualTo("Aportacion meta Viaje a Cancun");
        String longConcept = ContributionService.buildConcept("Una meta con un t\u00edtulo much\u00edsimo m\u00e1s largo de lo normal");
        assertThat(longConcept).hasSizeLessThanOrEqualTo(ContributionService.CONCEPT_MAX_LENGTH)
                .startsWith("Aportacion meta Una meta");
    }

    @Test
    void expirationBelowPeyMinimumIsRejected() {
        assertThatThrownBy(() -> new ContributionService(repository, goalService, peyClient, numRefGenerator, 300,
                false, Clock.systemUTC())).isInstanceOf(IllegalArgumentException.class);
    }

    private static Contribution stored(ContributionStatus status, Instant expiresAt) {
        Contribution c = new Contribution();
        c.setGoal(goal());
        c.setNumRef("1234567");
        c.setAmount(new BigDecimal("10.00"));
        c.setStatus(status);
        c.setExpiresAt(expiresAt);
        return c;
    }

    @Test
    void statusReportsExpiredWhenPendingAndPastExpiration() {
        when(repository.findByNumRef("1234567"))
                .thenReturn(Optional.of(stored(ContributionStatus.PENDING, NOW.minusSeconds(1))));

        ContributionStatusResponse res = service.getStatus("1234567");

        assertThat(res.status()).isEqualTo(ContributionStatus.EXPIRED);
        assertThat(res.goalId()).isEqualTo(1L);
    }

    @Test
    void statusKeepsPendingAndPaid() {
        when(repository.findByNumRef("1234567"))
                .thenReturn(Optional.of(stored(ContributionStatus.PENDING, NOW.plusSeconds(60))))
                .thenReturn(Optional.of(stored(ContributionStatus.PAID, NOW.minusSeconds(60))));

        assertThat(service.getStatus("1234567").status()).isEqualTo(ContributionStatus.PENDING);
        assertThat(service.getStatus("1234567").status()).isEqualTo(ContributionStatus.PAID);
    }

    @Test
    void statusNotFound() {
        when(repository.findByNumRef("7777777")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getStatus("7777777")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.getStatus("abc")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.getStatus("12345678")).isInstanceOf(NotFoundException.class);
    }
}
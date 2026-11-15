package com.pey.meta.goal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;

import com.pey.meta.common.BusinessException;
import com.pey.meta.common.NotFoundException;
import com.pey.meta.goal.dto.GoalRequest;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.entity.GoalStatus;
import com.pey.meta.goal.repository.GoalRepository;

@ExtendWith(MockitoExtension.class)
class GoalServiceTest {

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private ObjectProvider<PaidContributionsProvider> paidContributionsProvider;

    private GoalService goalService;

    @BeforeEach
    void setUp() {
        goalService = new GoalService(goalRepository, paidContributionsProvider);
    }

    private static Goal goal(String target, String raised, GoalStatus status) {
        Goal g = new Goal();
        g.setId(1L);
        g.setTitle("Colecta");
        g.setTargetAmount(new BigDecimal(target));
        g.setRaisedAmount(new BigDecimal(raised));
        g.setStatus(status);
        return g;
    }

    @Test
    void registerPaymentSumsAndStaysOpenBelowTarget() {
        Goal g = goal("1000.00", "200.00", GoalStatus.OPEN);
        when(goalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(g));

        Goal result = goalService.registerPayment(1L, new BigDecimal("150.50"));

        assertThat(result.getRaisedAmount()).isEqualByComparingTo("350.50");
        assertThat(result.getStatus()).isEqualTo(GoalStatus.OPEN);
    }

    @Test
    void registerPaymentClosesWhenReachingTargetExactly() {
        Goal g = goal("1000.00", "900.00", GoalStatus.OPEN);
        when(goalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(g));

        Goal result = goalService.registerPayment(1L, new BigDecimal("100.00"));

        assertThat(result.getRaisedAmount()).isEqualByComparingTo("1000.00");
        assertThat(result.getStatus()).isEqualTo(GoalStatus.CLOSED);
    }

    @Test
    void registerPaymentClosesWhenPassingTarget() {
        Goal g = goal("1000.00", "950.00", GoalStatus.OPEN);
        when(goalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(g));

        Goal result = goalService.registerPayment(1L, new BigDecimal("100.00"));

        assertThat(result.getRaisedAmount()).isEqualByComparingTo("1050.00");
        assertThat(result.getStatus()).isEqualTo(GoalStatus.CLOSED);
    }

    @Test
    void registerPaymentOnClosedGoalStillAddsTheMoney() {
        Goal g = goal("1000.00", "1000.00", GoalStatus.CLOSED);
        when(goalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(g));

        Goal result = goalService.registerPayment(1L, new BigDecimal("50.00"));

        assertThat(result.getRaisedAmount()).isEqualByComparingTo("1050.00");
        assertThat(result.getStatus()).isEqualTo(GoalStatus.CLOSED);
    }

    @Test
    void registerPaymentRejectsNullZeroOrNegative() {
        assertThatThrownBy(() -> goalService.registerPayment(1L, null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> goalService.registerPayment(1L, BigDecimal.ZERO)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> goalService.registerPayment(1L, new BigDecimal("-5"))).isInstanceOf(BusinessException.class);
        verifyNoInteractions(goalRepository);
    }

    @Test
    void registerPaymentOnMissingGoalThrowsNotFound() {
        when(goalRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> goalService.registerPayment(99L, BigDecimal.TEN))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getOpenGoalOrThrowReturnsOpenGoal() {
        Goal g = goal("1000.00", "0.00", GoalStatus.OPEN);
        when(goalRepository.findById(1L)).thenReturn(Optional.of(g));

        assertThat(goalService.getOpenGoalOrThrow(1L)).isSameAs(g);
    }

    @Test
    void getOpenGoalOrThrowRejectsClosedGoalWith409() {
        when(goalRepository.findById(1L)).thenReturn(Optional.of(goal("1000.00", "1000.00", GoalStatus.CLOSED)));

        assertThatThrownBy(() -> goalService.getOpenGoalOrThrow(1L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void updateLoweringTargetBelowRaisedClosesGoal() {
        Goal g = goal("1000.00", "600.00", GoalStatus.OPEN);
        when(goalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(g));

        Goal result = goalService.update(1L, new GoalRequest(" Nueva ", "  ", new BigDecimal("500"),
                List.of(new BigDecimal("200"), new BigDecimal("50"), new BigDecimal("50.00")), " Familia Ruiz ", "  "));

        assertThat(result.getStatus()).isEqualTo(GoalStatus.CLOSED);
        assertThat(result.getOrganizer()).isEqualTo("Familia Ruiz");
        assertThat(result.getCity()).isNull();
        assertThat(result.getTitle()).isEqualTo("Nueva");
        assertThat(result.getDescription()).isNull();
        assertThat(result.getPresetAmounts()).containsExactly(new BigDecimal("50.00"), new BigDecimal("200.00"));
    }

    @Test
    void reopenFailsWhenTargetAlreadyReached() {
        when(goalRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(goal("1000.00", "1000.00", GoalStatus.CLOSED)));

        assertThatThrownBy(() -> goalService.reopen(1L)).isInstanceOf(BusinessException.class);
    }

    @Test
    void publicDetailWithoutProviderReturnsZeroContributions() {
        when(goalRepository.findById(1L)).thenReturn(Optional.of(goal("1000.00", "250.00", GoalStatus.OPEN)));
        when(paidContributionsProvider.getIfAvailable()).thenReturn(null);

        var detail = goalService.getPublicDetail(1L, 10);

        assertThat(detail.percentage()).isEqualTo(25);
        assertThat(detail.paidContributionsCount()).isZero();
        assertThat(detail.recentContributions()).isEmpty();
    }
}
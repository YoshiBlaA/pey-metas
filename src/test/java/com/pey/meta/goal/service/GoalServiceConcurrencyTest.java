package com.pey.meta.goal.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.entity.GoalStatus;
import com.pey.meta.goal.repository.GoalRepository;

/**
 * Prueba con base de datos real (H2) que muchos pagos simultaneos a la misma meta no se pierden.
 * Sin transaccion de prueba para que cada pago haga commit por su cuenta, como en produccion.
 */
@DataJpaTest
@Import(GoalService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class GoalServiceConcurrencyTest {

    @Autowired
    private GoalService goalService;

    @Autowired
    private GoalRepository goalRepository;

    @AfterEach
    void cleanUp() {
        goalRepository.deleteAll();
    }

    private Long newGoal(String target) {
        Goal g = new Goal();
        g.setTitle("Colecta");
        g.setTargetAmount(new BigDecimal(target));
        g.replacePresetAmounts(List.of(new BigDecimal("10.00")));
        return goalRepository.save(g).getId();
    }

    private void payConcurrently(Long goalId, int payments, String amount) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < payments; i++) {
            futures.add(pool.submit(() -> {
                start.await();
                goalService.registerPayment(goalId, new BigDecimal(amount));
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();
    }

    @Test
    void concurrentPaymentsAreAllCounted() throws Exception {
        Long id = newGoal("1000.00");

        payConcurrently(id, 20, "10.00");

        Goal goal = goalRepository.findById(id).orElseThrow();
        assertThat(goal.getRaisedAmount()).isEqualByComparingTo("200.00");
        assertThat(goal.getStatus()).isEqualTo(GoalStatus.OPEN);
    }

    @Test
    void concurrentPaymentsCloseGoalWhenTargetReached() throws Exception {
        Long id = newGoal("100.00");

        payConcurrently(id, 20, "10.00");

        Goal goal = goalRepository.findById(id).orElseThrow();
        assertThat(goal.getRaisedAmount()).isEqualByComparingTo("200.00");
        assertThat(goal.getStatus()).isEqualTo(GoalStatus.CLOSED);
    }
}
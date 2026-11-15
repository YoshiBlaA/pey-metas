package com.pey.meta.goal.service;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Lo minimo de una aportacion PAGADA que necesita el detalle publico de una meta.
 */
public record PaidContributionView(
        String displayName,
        boolean anonymous,
        BigDecimal amount,
        String message,
        Instant paidAt) {
}
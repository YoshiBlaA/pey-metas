package com.pey.meta.contribution.client;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Respuesta de GET /transaction/codi/qr/{id} (transacciones de un QR de CoDi, 20 por pagina).
 * status es PENDING o PAID; datePaid en epoch segundos cuando ya se pago.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PeyQrTransactionsResponse(List<Item> items, String nextToken) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(String id, String status, BigDecimal amount, Long datePaid) {

        public boolean isPaid() {
            return "PAID".equalsIgnoreCase(status);
        }
    }
}

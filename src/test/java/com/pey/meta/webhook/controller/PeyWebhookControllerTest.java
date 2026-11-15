package com.pey.meta.webhook.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pey.meta.webhook.dto.PeyWebhookRequest;
import com.pey.meta.webhook.security.WebhookSignatureVerifier;
import com.pey.meta.webhook.service.PeyWebhookService;
import com.pey.meta.webhook.service.WebhookResult;

@ExtendWith(MockitoExtension.class)
class PeyWebhookControllerTest {

    private static final String BODY = """
            {"amount":150,"apiKeyId":"01M3QMMR6X9CBVDY1SF3G8QBJW","codiQrId":"01HXYZQR1234567890ABCDEFGH",
             "concept":"Aportacion","datePaid":1790724818,"numRef":"1234567",
             "transactionId":"01HXYZTXN1234567890RSTUVWX","type":"codi.qr.payment_received","nuevoCampo":"x"}
            """;

    @Mock
    private PeyWebhookService webhookService;

    private MockMvc mockMvc(WebhookSignatureVerifier verifier) {
        return MockMvcBuilders.standaloneSetup(new PeyWebhookController(webhookService, verifier, new ObjectMapper())).build();
    }

    @Test
    void respondeOkYPasaLosCamposAlServicio() throws Exception {
        when(webhookService.handle(any())).thenReturn(WebhookResult.PROCESSED);

        mockMvc((body, headers) -> true).perform(post("/api/webhooks/pey")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("webhook-signature", "v1,abc")
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true))
                .andExpect(jsonPath("$.result").value("PROCESSED"));

        ArgumentCaptor<PeyWebhookRequest> captor = ArgumentCaptor.forClass(PeyWebhookRequest.class);
        verify(webhookService).handle(captor.capture());
        PeyWebhookRequest event = captor.getValue();
        assertThat(event.numRef()).isEqualTo("1234567");
        assertThat(event.amount()).isEqualByComparingTo(new BigDecimal("150"));
        assertThat(event.datePaid()).isEqualTo(1790724818L);
        assertThat(event.transactionId()).isEqualTo("01HXYZTXN1234567890RSTUVWX");
        assertThat(event.type()).isEqualTo(PeyWebhookRequest.TYPE_QR_PAYMENT_RECEIVED);
    }

    @Test
    void jsonInvalidoResponde400() throws Exception {
        mockMvc((body, headers) -> true).perform(post("/api/webhooks/pey")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{no es json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.result").value("MALFORMED_JSON"));
        verifyNoInteractions(webhookService);
    }

    @Test
    void firmaInvalidaResponde401() throws Exception {
        mockMvc((body, headers) -> false).perform(post("/api/webhooks/pey")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.result").value("INVALID_SIGNATURE"));
        verifyNoInteractions(webhookService);
    }
}
package com.pey.meta.contribution.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.pey.meta.contribution.dto.ContributionCreatedResponse;
import com.pey.meta.contribution.dto.ContributionStatusResponse;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.exception.PeyApiException;
import com.pey.meta.contribution.service.ContributionService;

@WebMvcTest(ContributionController.class)
@AutoConfigureMockMvc(addFilters = false)
class ContributionControllerTest {

    private static final Instant EXPIRES = Instant.parse("2026-11-15T16:20:00Z");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ContributionService service;

    @Test
    void createReturns201WithLocation() throws Exception {
        when(service.create(eq(1L), any())).thenReturn(new ContributionCreatedResponse("1234567", 1L,
                new BigDecimal("150.50"), ContributionStatus.PENDING, EXPIRES, "AB12CD34EF", "QR", null));

        mvc.perform(post("/api/public/goals/1/contributions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":150.50,\"displayName\":\"Jairo\",\"anonymous\":false}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/public/contributions/1234567"))
                .andExpect(jsonPath("$.numRef").value("1234567"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.codiQrId").value("AB12CD34EF"));
    }

    @Test
    void createWithoutAmountReturns400() throws Exception {
        mvc.perform(post("/api/public/goals/1/contributions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Jairo\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("amount"));
        verifyNoInteractions(service);
    }

    @Test
    void peyFailureReturns502() throws Exception {
        when(service.create(eq(1L), any()))
                .thenThrow(new PeyApiException("Pey caido", 503, "SERVICE_UNAVAILABLE", "req-1", null));

        mvc.perform(post("/api/public/goals/1/contributions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":10,\"anonymous\":true}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502));
    }

    @Test
    void statusReturns200() throws Exception {
        when(service.getStatus("1234567")).thenReturn(new ContributionStatusResponse("1234567", 1L,
                ContributionStatus.PAID, new BigDecimal("10.00"), EXPIRES, EXPIRES.minusSeconds(60)));

        mvc.perform(get("/api/public/contributions/1234567"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.amount").value(10.0));
    }
}
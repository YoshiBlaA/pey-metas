package com.pey.meta.contribution.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.pey.meta.contribution.exception.PeyApiException;

class PeyClientTest {

    private MockRestServiceServer server;
    private PeyClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new PeyClient(builder, "https://api.test/", "test-key");
    }

    private static PeyCreateQrRequest request() {
        return new PeyCreateQrRequest(new BigDecimal("150.50"), "Aportacion meta Colecta", 1200, "1234567", null);
    }

    @Test
    void createQrSendsDocumentedBodyAndParsesResponse() {
        server.expect(requestTo("https://api.test/codi/qr"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(jsonPath("$.amount").value(150.5))
                .andExpect(jsonPath("$.concept").value("Aportacion meta Colecta"))
                .andExpect(jsonPath("$.expiration").value(1200))
                .andExpect(jsonPath("$.numRef").value("1234567"))
                .andExpect(jsonPath("$.generateImage").doesNotExist())
                .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"id\":\"AB12CD34EF\",\"qrString\":\"{\\\"IDC\\\":\\\"AB12CD34EF\\\"}\",\"qrImage\":null}"));

        PeyQrResponse res = client.createQr(request());

        assertThat(res.id()).isEqualTo("AB12CD34EF");
        assertThat(res.qrString()).contains("AB12CD34EF");
        assertThat(res.qrImage()).isNull();
        server.verify();
    }

    @Test
    void documentedErrorBodyBecomesPeyApiException() {
        server.expect(requestTo("https://api.test/codi/qr"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"Expiration must be 0 or at least 360\","
                                + "\"type\":\"INVALID_PARAMETER\",\"requestId\":\"abc123\"}}"));

        assertThatThrownBy(() -> client.createQr(request()))
                .isInstanceOf(PeyApiException.class)
                .satisfies(ex -> {
                    PeyApiException pe = (PeyApiException) ex;
                    assertThat(pe.getPeyStatus()).isEqualTo(400);
                    assertThat(pe.getErrorType()).isEqualTo("INVALID_PARAMETER");
                    assertThat(pe.getRequestId()).isEqualTo("abc123");
                });
    }

    @Test
    void nonJsonErrorStillBecomesPeyApiException() {
        server.expect(requestTo("https://api.test/codi/qr"))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY).body("oops"));

        assertThatThrownBy(() -> client.createQr(request()))
                .isInstanceOf(PeyApiException.class)
                .satisfies(ex -> assertThat(((PeyApiException) ex).getPeyStatus()).isEqualTo(502));
    }

    @Test
    void responseWithoutIdIsRejected() {
        server.expect(requestTo("https://api.test/codi/qr"))
                .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON).body("{}"));

        assertThatThrownBy(() -> client.createQr(request())).isInstanceOf(PeyApiException.class);
    }

    @Test
    void missingApiKeyFailsWithoutCallingPey() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer noCalls = MockRestServiceServer.bindTo(builder).build();
        PeyClient noKey = new PeyClient(builder, "https://api.test", "  ");

        assertThatThrownBy(() -> noKey.createQr(request()))
                .isInstanceOf(PeyApiException.class)
                .hasMessageContaining("PEY_API_KEY");
        noCalls.verify();
    }

    @Test
    void getQrTransactionsLeeLosPagos() {
        server.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo("https://api.test/transaction/codi/qr/351420196d"))
                .andExpect(org.springframework.test.web.client.match.MockRestRequestMatchers.header("Authorization", "Bearer test-key"))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(
                        "{\"items\":[{\"id\":\"TX1\",\"status\":\"PAID\",\"amount\":0.01,\"datePaid\":1794780519,\"currency\":\"MXN\"}],\"nextToken\":null}",
                        org.springframework.http.MediaType.APPLICATION_JSON));

        java.util.List<PeyQrTransactionsResponse.Item> items = client.getQrTransactions("351420196d");

        org.assertj.core.api.Assertions.assertThat(items).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(items.get(0).isPaid()).isTrue();
        org.assertj.core.api.Assertions.assertThat(items.get(0).id()).isEqualTo("TX1");
        org.assertj.core.api.Assertions.assertThat(items.get(0).datePaid()).isEqualTo(1794780519L);
        server.verify();
    }
}

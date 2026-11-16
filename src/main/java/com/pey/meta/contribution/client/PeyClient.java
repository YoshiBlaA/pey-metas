package com.pey.meta.contribution.client;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.pey.meta.contribution.exception.PeyApiException;

/**
 * Cliente HTTP de la API de Pey (https://docs.pey.mx): crear QR de CoDi y consultar sus transacciones.
 * Autenticacion: header Authorization: Bearer {pey.api-key}.
 */
@Component
public class PeyClient {

    private static final Logger log = LoggerFactory.getLogger(PeyClient.class);

    static final String CREATE_QR_PATH = "/codi/qr";
    static final String QR_TRANSACTIONS_PATH = "/transaction/codi/qr/{id}";

    private final RestClient restClient;
    private final String apiKey;

    @Autowired
    public PeyClient(RestClient.Builder builder,
                     @Value("${pey.api-url:${PEY_API_URL:https://api.pey.mx}}") String apiUrl,
                     @Value("${pey.api-key:${PEY_API_KEY:}}") String apiKey,
                     @Value("${pey.connect-timeout-ms:${PEY_CONNECT_TIMEOUT_MS:5000}}") long connectTimeoutMs,
                     @Value("${pey.read-timeout-ms:${PEY_READ_TIMEOUT_MS:30000}}") long readTimeoutMs) {
        this(builder.clone().requestFactory(requestFactory(connectTimeoutMs, readTimeoutMs)), apiUrl, apiKey);
    }

    /** Para pruebas: permite enlazar el builder con MockRestServiceServer. */
    PeyClient(RestClient.Builder builder, String apiUrl, String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.restClient = builder.baseUrl(stripTrailingSlash(apiUrl)).build();
    }

    /**
     * Crea un QR de CoDi.
     * @throws PeyApiException si falta la API key, Pey responde error, no hay conexion o la respuesta no trae id/qrString
     */
    public PeyQrResponse createQr(PeyCreateQrRequest request) {
        if (apiKey.isEmpty()) {
            throw new PeyApiException("PEY_API_KEY no est\u00e1 configurada");
        }
        PeyQrResponse body;
        try {
            body = restClient.post()
                    .uri(CREATE_QR_PATH)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(PeyQrResponse.class);
        } catch (RestClientResponseException ex) {
            PeyErrorResponse.PeyError error = parseError(ex);
            int status = ex.getStatusCode().value();
            String type = error == null ? null : error.type();
            String requestId = error == null ? null : error.requestId();
            String detail = error != null && error.message() != null ? error.message() : ex.getStatusText();
            log.warn("Pey rechaz\u00f3 crear QR numRef={} status={} type={} requestId={} message={}",
                    request.numRef(), status, type, requestId, detail);
            throw new PeyApiException("Pey respondi\u00f3 HTTP " + status + (type == null ? "" : " " + type) + ": " + detail,
                    status, type, requestId, ex);
        } catch (RestClientException ex) {
            log.warn("No se pudo comunicar con Pey al crear QR numRef={}: {}", request.numRef(), ex.getMessage());
            throw new PeyApiException("No se pudo comunicar con Pey: " + ex.getMessage(), null, null, null, ex);
        }
        if (body == null || isBlank(body.id()) || isBlank(body.qrString())) {
            throw new PeyApiException("Pey respondi\u00f3 sin id o qrString del QR");
        }
        return body;
    }

    /**
     * Transacciones de un QR de CoDi (primera pagina, hasta 20). Sirve para conciliar pagos cuando el webhook
     * no llega. Nunca regresa null: si Pey no responde items, la lista va vacia.
     * @throws PeyApiException si falta la API key, Pey responde error o no hay conexion
     */
    public java.util.List<PeyQrTransactionsResponse.Item> getQrTransactions(String codiQrId) {
        if (apiKey.isEmpty()) {
            throw new PeyApiException("PEY_API_KEY no está configurada");
        }
        try {
            PeyQrTransactionsResponse body = restClient.get()
                    .uri(QR_TRANSACTIONS_PATH, codiQrId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(PeyQrTransactionsResponse.class);
            return body == null || body.items() == null ? java.util.List.of() : body.items();
        } catch (RestClientResponseException ex) {
            throw new PeyApiException("Pey respondió HTTP " + ex.getStatusCode().value() + " al consultar el QR " + codiQrId,
                    ex.getStatusCode().value(), null, null, ex);
        } catch (RestClientException ex) {
            throw new PeyApiException("No se pudo comunicar con Pey: " + ex.getMessage(), null, null, null, ex);
        }
    }

    private static PeyErrorResponse.PeyError parseError(RestClientResponseException ex) {
        try {
            PeyErrorResponse parsed = ex.getResponseBodyAs(PeyErrorResponse.class);
            return parsed == null ? null : parsed.error();
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static SimpleClientHttpRequestFactory requestFactory(long connectTimeoutMs, long readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return factory;
    }

    private static String stripTrailingSlash(String url) {
        String u = url == null || url.isBlank() ? "https://api.pey.mx" : url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
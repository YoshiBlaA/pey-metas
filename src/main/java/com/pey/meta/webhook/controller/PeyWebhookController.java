package com.pey.meta.webhook.controller;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pey.meta.webhook.dto.PeyWebhookRequest;
import com.pey.meta.webhook.dto.WebhookAckResponse;
import com.pey.meta.webhook.security.WebhookSignatureVerifier;
import com.pey.meta.webhook.service.PeyWebhookService;
import com.pey.meta.webhook.service.WebhookResult;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/webhooks")
@Tag(name = "Webhooks", description = "Avisos de pago que manda Pey")
public class PeyWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PeyWebhookController.class);

    private final PeyWebhookService webhookService;
    private final WebhookSignatureVerifier signatureVerifier;
    private final ObjectMapper objectMapper;

    public PeyWebhookController(PeyWebhookService webhookService,
                                WebhookSignatureVerifier signatureVerifier,
                                ObjectMapper objectMapper) {
        this.webhookService = webhookService;
        this.signatureVerifier = signatureVerifier;
        this.objectMapper = objectMapper;
    }

    @PostMapping(value = "/pey", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Recibe el webhook de Pey",
            description = "Para type codi.qr.payment_received busca la aportacion por numRef y, si estaba PENDING o EXPIRED, "
                    + "la marca PAID y suma el monto reportado por Pey a la meta. Es idempotente: un aviso repetido no se cuenta dos veces. "
                    + "numRef desconocido u otros tipos de evento se registran en log y responden 200. "
                    + "Requiere firma Standard Webhooks valida (headers webhook-id, webhook-timestamp y webhook-signature); si no, responde 401 y no registra nada.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = PeyWebhookRequest.class))))
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Aviso recibido (procesado, repetido, numRef desconocido o ignorado)",
                    content = @Content(schema = @Schema(implementation = WebhookAckResponse.class))),
            @ApiResponse(responseCode = "400", description = "El cuerpo no es JSON valido",
                    content = @Content(schema = @Schema(implementation = WebhookAckResponse.class))),
            @ApiResponse(responseCode = "401", description = "Firma invalida, headers de firma faltantes o timestamp fuera de tolerancia",
                    content = @Content(schema = @Schema(implementation = WebhookAckResponse.class))),
            @ApiResponse(responseCode = "500", description = "Error interno; Pey puede reintentar")
    })
    public ResponseEntity<WebhookAckResponse> receive(
            @Parameter(hidden = true) @RequestBody byte[] rawBody,
            @Parameter(hidden = true) @RequestHeader HttpHeaders headers) {

        if (!signatureVerifier.verify(rawBody, headers)) {
            log.warn("Webhook de Pey con firma invalida; se rechaza");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new WebhookAckResponse(false, "INVALID_SIGNATURE"));
        }

        PeyWebhookRequest event;
        try {
            event = objectMapper.readValue(rawBody, PeyWebhookRequest.class);
        } catch (IOException e) {
            log.warn("Webhook de Pey con JSON invalido: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new WebhookAckResponse(false, "MALFORMED_JSON"));
        }

        WebhookResult result = webhookService.handle(event);
        return ResponseEntity.ok(new WebhookAckResponse(true, result.name()));
    }
}
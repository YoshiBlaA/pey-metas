package com.pey.meta.contribution.controller;

import java.net.URI;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.pey.meta.common.ErrorResponse;
import com.pey.meta.contribution.dto.ContributionCreatedResponse;
import com.pey.meta.contribution.dto.ContributionStatusResponse;
import com.pey.meta.contribution.dto.CreateContributionRequest;
import com.pey.meta.contribution.service.ContributionService;

@RestController
@RequestMapping("/api/public")
@Tag(name = "Aportaciones (p\u00fablico)", description = "Crear aportaciones con QR de CoDi y consultar su estado")
public class ContributionController {

    private final ContributionService contributionService;

    public ContributionController(ContributionService contributionService) {
        this.contributionService = contributionService;
    }

    @PostMapping("/goals/{goalId}/contributions")
    @Operation(summary = "Crear aportaci\u00f3n y QR de CoDi",
            description = "Valida la meta y los datos, crea el QR en Pey (vigencia pey.qr-expiration-seconds) "
                    + "y regresa el numRef para hacer polling del estado.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Aportaci\u00f3n creada (PENDING) con su QR",
                    content = @Content(schema = @Schema(implementation = ContributionCreatedResponse.class))),
            @ApiResponse(responseCode = "400", description = "Cuerpo inv\u00e1lido o mal formado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "La meta no existe",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "La meta est\u00e1 cerrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Regla de negocio (monto, nombre, mensaje)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "502", description = "Pey no pudo crear el QR",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ContributionCreatedResponse> create(@PathVariable Long goalId,
                                                              @Valid @RequestBody CreateContributionRequest request) {
        ContributionCreatedResponse body = contributionService.create(goalId, request);
        return ResponseEntity.created(URI.create("/api/public/contributions/" + body.numRef())).body(body);
    }

    @GetMapping("/contributions/{numRef}")
    @Operation(summary = "Estado de una aportaci\u00f3n",
            description = "Para polling: PENDING, PAID o EXPIRED. Un PENDING vencido se reporta como EXPIRED.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Estado actual",
                    content = @Content(schema = @Schema(implementation = ContributionStatusResponse.class))),
            @ApiResponse(responseCode = "404", description = "No existe una aportaci\u00f3n con ese numRef",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ContributionStatusResponse status(@PathVariable String numRef) {
        return contributionService.getStatus(numRef);
    }
}
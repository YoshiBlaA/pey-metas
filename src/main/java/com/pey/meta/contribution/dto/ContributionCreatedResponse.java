package com.pey.meta.contribution.dto;

import java.math.BigDecimal;
import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

import com.pey.meta.contribution.entity.ContributionStatus;

@Schema(description = "Aportaci\u00f3n creada con su QR de CoDi")
public record ContributionCreatedResponse(
        @Schema(description = "Referencia num\u00e9rica (7 d\u00edgitos) para consultar el estado", example = "4821937")
        String numRef,
        Long goalId,
        BigDecimal amount,
        @Schema(description = "Siempre PENDING al crear")
        ContributionStatus status,
        @Schema(description = "Vencimiento del QR (UTC)")
        Instant expiresAt,
        @Schema(description = "IDC del QR asignado por Banxico (campo id de Pey)", example = "AB12CD34EF")
        String codiQrId,
        @Schema(description = "Payload del QR (campo qrString de Pey); el front lo dibuja como QR")
        String qrString,
        @Schema(description = "PNG en base64 (campo qrImage de Pey); null salvo que pey.generate-image=true", nullable = true)
        String qrImage) {
}
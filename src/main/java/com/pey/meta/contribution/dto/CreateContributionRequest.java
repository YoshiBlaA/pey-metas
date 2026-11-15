package com.pey.meta.contribution.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;

import com.pey.meta.contribution.entity.Contribution;

@Schema(description = "Datos para crear una aportaci\u00f3n y su QR de CoDi")
public record CreateContributionRequest(
        @Schema(description = "Monto en MXN, mayor a 0 y m\u00e1ximo 2 decimales", example = "150.00",
                requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0")
        @Digits(integer = 10, fraction = 2, message = "El monto admite m\u00e1ximo 10 enteros y 2 decimales")
        BigDecimal amount,

        @Schema(description = "Nombre o apodo. Obligatorio si anonymous es false", example = "Jairo",
                maxLength = Contribution.MAX_DISPLAY_NAME)
        @Size(max = Contribution.MAX_DISPLAY_NAME, message = "El nombre admite m\u00e1ximo 60 caracteres")
        String displayName,

        @Schema(description = "true para aparecer como An\u00f3nimo", example = "false", defaultValue = "false")
        Boolean anonymous,

        @Schema(description = "Mensaje opcional", example = "Mucho \u00e9xito", maxLength = Contribution.MAX_MESSAGE)
        @Size(max = Contribution.MAX_MESSAGE, message = "El mensaje admite m\u00e1ximo 200 caracteres")
        String message) {
}
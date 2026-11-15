package com.pey.meta.goal.dto;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Datos para crear o editar una meta. En la edicion se reemplazan todos los campos.")
public record GoalRequest(
        @Schema(description = "Titulo de la meta", example = "Colecta para el albergue")
        @NotBlank(message = "El t\u00edtulo es obligatorio")
        @Size(max = 150, message = "El t\u00edtulo admite m\u00e1ximo 150 caracteres")
        String title,

        @Schema(description = "Descripcion opcional", example = "Juntamos para comprar alimento y cobijas")
        @Size(max = 2000, message = "La descripci\u00f3n admite m\u00e1ximo 2000 caracteres")
        String description,

        @Schema(description = "Meta en MXN", example = "5000.00")
        @NotNull(message = "La meta es obligatoria")
        @DecimalMin(value = "0.01", message = "La meta debe ser mayor a 0")
        @Digits(integer = 10, fraction = 2, message = "La meta admite hasta 10 enteros y 2 decimales")
        BigDecimal targetAmount,

        @ArraySchema(arraySchema = @Schema(description = "Montos predeterminados en MXN que se ofrecen a quien aporta"),
                schema = @Schema(example = "100.00"))
        @Size(max = 12, message = "M\u00e1ximo 12 montos predeterminados")
        List<
                @NotNull(message = "Los montos predeterminados no pueden ir vac\u00edos")
                @DecimalMin(value = "0.01", message = "Cada monto predeterminado debe ser mayor a 0")
                @Digits(integer = 10, fraction = 2, message = "Cada monto admite hasta 10 enteros y 2 decimales")
                BigDecimal> presetAmounts) {
}
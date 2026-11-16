package com.pey.meta.auth.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Admin autenticado")
public record AdminProfileResponse(
        @Schema(example = "7") Long id,
        @Schema(example = "familia@correo.com") String username,
        @Schema(description = "Nombre de la persona u organizacion", example = "Familia Ramirez", nullable = true)
        String name,
        @Schema(example = "[\"ROLE_ADMIN\"]") List<String> roles) {
}

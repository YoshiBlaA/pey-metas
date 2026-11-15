package com.pey.meta.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Credenciales del admin")
public record LoginRequest(
        @Schema(example = "admin")
        @NotBlank(message = "El usuario es obligatorio")
        @Size(max = 100, message = "El usuario no puede pasar de 100 caracteres")
        String username,

        @Schema(example = "cambia-esto")
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(max = 200, message = "La contraseña no puede pasar de 200 caracteres")
        String password) {

    /** No exponer la contraseña en logs. */
    @Override
    public String toString() {
        return "LoginRequest[username=" + username + ", password=****]";
    }
}
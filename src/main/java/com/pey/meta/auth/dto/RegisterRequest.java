package com.pey.meta.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Datos para crear una cuenta de administrador de metas")
public record RegisterRequest(
        @Schema(description = "Nombre de la persona u organizacion", example = "Familia Ramirez")
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre admite máximo 100 caracteres")
        String name,

        @Schema(description = "Correo; es el usuario para iniciar sesion", example = "familia@correo.com")
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Escribe un correo válido")
        @Size(max = 100, message = "El correo admite máximo 100 caracteres")
        String email,

        @Schema(example = "una-contrasena-larga")
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 200, message = "La contraseña debe tener entre 8 y 200 caracteres")
        String password) {

    /** No exponer la contrasena en logs. */
    @Override
    public String toString() {
        return "RegisterRequest[name=" + name + ", email=" + email + ", password=****]";
    }
}

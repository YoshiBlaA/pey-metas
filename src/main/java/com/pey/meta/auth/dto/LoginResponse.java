package com.pey.meta.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Token JWT para usar en el header Authorization: Bearer <token>")
public record LoginResponse(
        @Schema(description = "JWT firmado") String token,
        @Schema(example = "Bearer") String tokenType,
        @Schema(description = "Vigencia del token en segundos", example = "3600") long expiresIn) {

    public static final String BEARER = "Bearer";

    public static LoginResponse bearer(String token, long expiresInSeconds) {
        return new LoginResponse(token, BEARER, expiresInSeconds);
    }
}
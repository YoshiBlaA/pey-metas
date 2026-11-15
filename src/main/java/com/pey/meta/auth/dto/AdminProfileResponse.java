package com.pey.meta.auth.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Admin autenticado")
public record AdminProfileResponse(
        @Schema(example = "admin") String username,
        @Schema(example = "[\"ROLE_ADMIN\"]") List<String> roles) {
}
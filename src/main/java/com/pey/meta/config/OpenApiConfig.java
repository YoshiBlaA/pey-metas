package com.pey.meta.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger/OpenAPI. Define el esquema de seguridad "bearerAuth" (JWT).
 * En los controladores de admin usa {@code @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)}.
 */
@Configuration
public class OpenApiConfig {

    public static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI peyBackendOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("pey_backend API")
                        .description("Metas de donación con barra de progreso y cobros con QR de CoDi vía la API de Pey.")
                        .version("v1"))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT obtenido en POST /api/auth/login")));
    }
}

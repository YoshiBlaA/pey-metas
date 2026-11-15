package com.pey.meta.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS para el front-end. Lee {@code app.cors.origins} (variable CORS_ORIGINS, separada por comas).
 * Cada valor es un patrón de origen ({@code setAllowedOriginPatterns}), así que acepta orígenes exactos
 * ({@code http://localhost:5173}), comodines ({@code https://*.vercel.app}) o {@code *} para cualquier origen.
 * Con patrones, {@code *} funciona aun con {@code allowCredentials(true)} (el navegador recibe el origen real).
 * Usa {@code *} solo en desarrollo; en producción lista los dominios del front.
 * SecurityConfig (GuardiaBot) debe activar CORS con {@code http.cors(Customizer.withDefaults())},
 * que toma este bean {@code corsConfigurationSource} automáticamente.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.origins:http://localhost:3000}") String origins) {
        List<String> allowedOrigins = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

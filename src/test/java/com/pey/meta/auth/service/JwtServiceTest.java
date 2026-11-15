package com.pey.meta.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

class JwtServiceTest {

    private static final String BASE64_SECRET =
            Base64.getEncoder().encodeToString("secreto-de-prueba-unitaria-de-32-bytes-o-mas!".getBytes(StandardCharsets.UTF_8));
    private static final String PLAIN_SECRET = "otro-secreto-en-texto-plano-de-mas-de-32-bytes";

    private final UserDetails admin = User.withUsername("admin").password("x").roles("ADMIN").build();

    @Test
    void generaYValidaToken() {
        JwtService jwt = new JwtService(BASE64_SECRET, 60_000);
        String token = jwt.generateToken(admin);

        assertThat(jwt.isTokenValid(token)).isTrue();
        assertThat(jwt.isTokenValid(token, admin)).isTrue();
        assertThat(jwt.extractUsername(token)).contains("admin");
        assertThat(jwt.parseClaims(token).orElseThrow().get(JwtService.ROLES_CLAIM, java.util.List.class))
                .containsExactly("ROLE_ADMIN");
        assertThat(jwt.getExpirationSeconds()).isEqualTo(60);
    }

    @Test
    void aceptaSecretoEnTextoPlano() {
        JwtService jwt = new JwtService(PLAIN_SECRET, 60_000);
        assertThat(jwt.isTokenValid(jwt.generateToken(admin))).isTrue();
    }

    @Test
    void tokenDeOtroUsuarioNoEsValidoParaEsteUsuario() {
        JwtService jwt = new JwtService(BASE64_SECRET, 60_000);
        UserDetails otro = User.withUsername("otro").password("x").roles("ADMIN").build();
        assertThat(jwt.isTokenValid(jwt.generateToken(admin), otro)).isFalse();
    }

    @Test
    void tokenAlteradoEsInvalido() {
        JwtService jwt = new JwtService(BASE64_SECRET, 60_000);
        String token = jwt.generateToken(admin);
        String[] parts = token.split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace("\"admin\"", "\"hacker\"");
        String forged = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + parts[2];

        assertThat(jwt.isTokenValid(forged)).isFalse();
        assertThat(jwt.isTokenValid(token.substring(0, token.length() - 2) + "xx")).isFalse();
        assertThat(jwt.isTokenValid("no-es-un-jwt")).isFalse();
        assertThat(jwt.isTokenValid("")).isFalse();
        assertThat(jwt.isTokenValid(null)).isFalse();
    }

    @Test
    void tokenFirmadoConOtraLlaveEsInvalido() {
        JwtService jwt = new JwtService(BASE64_SECRET, 60_000);
        JwtService otro = new JwtService(PLAIN_SECRET, 60_000);
        assertThat(jwt.isTokenValid(otro.generateToken(admin))).isFalse();
    }

    @Test
    void tokenExpiradoEsInvalido() throws InterruptedException {
        JwtService jwt = new JwtService(BASE64_SECRET, 1);
        String token = jwt.generateToken(admin);
        Thread.sleep(1_100);
        assertThat(jwt.isTokenValid(token)).isFalse();
        assertThat(jwt.extractUsername(token)).isEmpty();
    }

    @Test
    void rechazaSecretoVacioOCorto() {
        assertThatThrownBy(() -> new JwtService("", 60_000)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtService(null, 60_000)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtService("corto", 60_000)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtService(BASE64_SECRET, 0)).isInstanceOf(IllegalStateException.class);
    }
}
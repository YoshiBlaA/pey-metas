package com.pey.meta.auth.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

/**
 * Genera y valida los JWT del admin (HMAC-SHA con jjwt 0.12).
 * <p>
 * {@code app.jwt.secret} (JWT_SECRET) puede venir en Base64 o en texto plano; en ambos casos
 * debe dar al menos 32 bytes. Si falta o es corto, la aplicación no arranca.
 */
@Service
public class JwtService {

    static final int MIN_KEY_BYTES = 32;
    static final String ROLES_CLAIM = "roles";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.expiration:3600000}") long expirationMs) {
        if (expirationMs <= 0) {
            throw new IllegalStateException("app.jwt.expiration (JWT_EXPIRATION) debe ser mayor que 0 ms");
        }
        this.key = Keys.hmacShaKeyFor(resolveKeyBytes(secret));
        this.expirationMs = expirationMs;
    }

    /** Usa el secreto decodificado si es Base64 válido de 32+ bytes; si no, sus bytes UTF-8. */
    static byte[] resolveKeyBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Falta app.jwt.secret (variable JWT_SECRET). "
                    + "Usa un secreto aleatorio de al menos 32 bytes, de preferencia en Base64.");
        }
        String value = secret.trim();
        byte[] decoded = tryDecodeBase64(value);
        if (decoded != null && decoded.length >= MIN_KEY_BYTES) {
            return decoded;
        }
        byte[] raw = value.getBytes(StandardCharsets.UTF_8);
        if (raw.length >= MIN_KEY_BYTES) {
            return raw;
        }
        throw new IllegalStateException("app.jwt.secret (JWT_SECRET) es muy corto: "
                + "se necesitan al menos " + MIN_KEY_BYTES + " bytes para HS256.");
    }

    private static byte[] tryDecodeBase64(String value) {
        try {
            return Base64.getDecoder().decode(value);
        } catch (IllegalArgumentException e) {
            try {
                return Base64.getUrlDecoder().decode(value);
            } catch (IllegalArgumentException e2) {
                return null;
            }
        }
    }

    public String generateToken(UserDetails user) {
        List<String> roles = user.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        Date now = new Date();
        Date expiration = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(user.getUsername())
                .claim(ROLES_CLAIM, roles)
                .issuedAt(now)
                .expiration(expiration)
                .signWith(key)
                .compact();
    }

    /** Claims del token si la firma es correcta y no ha expirado; vacío en cualquier otro caso. */
    public Optional<Claims> parseClaims(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public Optional<String> extractUsername(String token) {
        return parseClaims(token).map(Claims::getSubject);
    }

    public boolean isTokenValid(String token) {
        return parseClaims(token).isPresent();
    }

    public boolean isTokenValid(String token, UserDetails user) {
        return extractUsername(token).map(u -> u.equals(user.getUsername())).orElse(false);
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    /** Vigencia del token en segundos (para {@code expiresIn}). */
    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }
}
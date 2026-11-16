package com.pey.meta.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pey.meta.auth.dto.AdminProfileResponse;
import com.pey.meta.config.OpenApiConfig;

/**
 * Datos del admin autenticado; sirve al front para comprobar que el token sigue vigente.
 */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Auth", description = "Login del panel de admin (JWT)")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AdminProfileController {

    private final com.pey.meta.auth.service.CurrentAdmin currentAdmin;

    public AdminProfileController(com.pey.meta.auth.service.CurrentAdmin currentAdmin) {
        this.currentAdmin = currentAdmin;
    }

    @GetMapping("/me")
    @Operation(summary = "Admin autenticado", description = "Regresa el usuario del token JWT.")
    public AdminProfileResponse me(@AuthenticationPrincipal UserDetails user) {
        com.pey.meta.auth.entity.AdminUser admin = currentAdmin.get(user);
        return new AdminProfileResponse(admin.getId(), user.getUsername(), admin.getName(),
                user.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList());
    }
}
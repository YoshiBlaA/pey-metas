package com.pey.meta.auth.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.auth.entity.AdminUser;
import com.pey.meta.auth.repository.AdminUserRepository;
import com.pey.meta.common.NotFoundException;

/**
 * Resuelve el admin autenticado (del JWT) a su fila en admin_users. Cada admin solo ve y maneja sus metas,
 * asi que los controladores de /api/admin usan {@link #id(UserDetails)} como dueno.
 */
@Component
public class CurrentAdmin {

    private final AdminUserRepository adminUserRepository;

    public CurrentAdmin(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Transactional(readOnly = true)
    public AdminUser get(UserDetails user) {
        return adminUserRepository.findByUsername(user.getUsername())
                .orElseThrow(() -> new NotFoundException("Administrador", user.getUsername()));
    }

    public Long id(UserDetails user) {
        return get(user).getId();
    }
}

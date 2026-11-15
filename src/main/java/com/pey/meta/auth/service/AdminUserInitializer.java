package com.pey.meta.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.auth.entity.AdminUser;
import com.pey.meta.auth.entity.Role;
import com.pey.meta.auth.repository.AdminUserRepository;

/**
 * Crea el admin inicial con app.admin.username / app.admin.password (ADMIN_USERNAME / ADMIN_PASSWORD)
 * si todavía no existe. Nunca cambia un admin existente ni escribe la contraseña en el log.
 */
@Component
public class AdminUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;

    public AdminUserInitializer(AdminUserRepository adminUserRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.admin.username:admin}") String username,
                                @Value("${app.admin.password:}") String password) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username == null ? "" : username.trim();
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (username.isEmpty()) {
            log.warn("ADMIN_USERNAME vacío: no se crea el admin inicial.");
            return;
        }
        if (adminUserRepository.existsByUsername(username)) {
            log.info("El admin inicial '{}' ya existe; no se modifica.", username);
            return;
        }
        if (password == null || password.isBlank()) {
            log.warn("ADMIN_PASSWORD vacío: no se crea el admin inicial '{}'.", username);
            return;
        }
        adminUserRepository.save(new AdminUser(username, passwordEncoder.encode(password), Role.ADMIN));
        log.info("Admin inicial '{}' creado.", username);
    }
}
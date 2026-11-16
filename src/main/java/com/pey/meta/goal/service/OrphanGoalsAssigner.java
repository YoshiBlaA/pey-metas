package com.pey.meta.goal.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.pey.meta.auth.repository.AdminUserRepository;
import com.pey.meta.goal.repository.GoalRepository;

/**
 * Al arrancar, las metas sin dueno (creadas antes de que hubiera cuentas por admin) pasan al admin inicial
 * (ADMIN_USERNAME). Corre despues de AdminUserInitializer. Si no hay admin inicial, no hace nada.
 */
@Component
@Order(2)
public class OrphanGoalsAssigner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OrphanGoalsAssigner.class);

    private final GoalRepository goalRepository;
    private final AdminUserRepository adminUserRepository;
    private final String username;

    public OrphanGoalsAssigner(GoalRepository goalRepository, AdminUserRepository adminUserRepository,
                               @Value("${app.admin.username:admin}") String username) {
        this.goalRepository = goalRepository;
        this.adminUserRepository = adminUserRepository;
        this.username = username == null ? "" : username.trim();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (username.isEmpty()) {
            return;
        }
        adminUserRepository.findByUsername(username).ifPresent(admin -> {
            int n = goalRepository.assignOwnerToOrphans(admin.getId());
            if (n > 0) {
                log.info("{} metas sin due\u00f1o se asignaron al admin '{}'.", n, username);
            }
        });
    }
}

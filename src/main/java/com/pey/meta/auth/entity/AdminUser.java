package com.pey.meta.auth.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Usuario del panel de admin. La contraseña se guarda solo como hash BCrypt.
 */
@Entity
@Table(name = "admin_users",
        uniqueConstraints = @UniqueConstraint(name = "uk_admin_users_username", columnNames = "username"))
public class AdminUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    /** Hash BCrypt, nunca la contraseña en claro. */
    @Column(nullable = false, length = 100)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.ADMIN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AdminUser() {
        // JPA
    }

    public AdminUser(String username, String passwordHash, Role role) {
        this.username = username;
        this.password = passwordHash;
        this.role = role;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String passwordHash) {
        this.password = passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public String toString() {
        return "AdminUser{id=" + id + ", username='" + username + "', role=" + role + "}";
    }
}
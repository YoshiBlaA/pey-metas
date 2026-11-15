package com.pey.meta.contribution.entity;

/**
 * Estado de una aportacion (cobro con QR de CoDi).
 * PENDING al crear el QR; PAID cuando llega el webhook de Pey; EXPIRED si vencio sin pago
 * (el marcado en BD de PAID y EXPIRED lo hace el modulo webhook).
 */
public enum ContributionStatus {
    PENDING,
    PAID,
    EXPIRED
}
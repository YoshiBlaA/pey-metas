package com.pey.meta.common;

import org.springframework.http.HttpStatus;

/**
 * Regla de negocio violada (por ejemplo, meta cerrada o monto inválido).
 * Por defecto responde 422; usa {@link HttpStatus#CONFLICT} (409) para conflictos de estado.
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(String message) {
        this(message, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static BusinessException conflict(String message) {
        return new BusinessException(message, HttpStatus.CONFLICT);
    }
}

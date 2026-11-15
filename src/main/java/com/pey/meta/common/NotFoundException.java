package com.pey.meta.common;

/**
 * Recurso no encontrado. Se responde con 404.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public NotFoundException(String resource, Object id) {
        super(resource + " no encontrado: " + id);
    }
}

package com.pey.meta.common;

import java.time.Instant;
import java.util.List;

/**
 * Formato único de error para toda la API.
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<FieldError> errors) {

    /** Error de validación de un campo. */
    public record FieldError(String field, String message) {
    }

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path, List.of());
    }

    public static ErrorResponse of(int status, String error, String message, String path, List<FieldError> errors) {
        return new ErrorResponse(Instant.now(), status, error, message, path, errors == null ? List.of() : errors);
    }
}

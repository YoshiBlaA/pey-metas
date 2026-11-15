package com.pey.meta.contribution.exception;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.pey.meta.common.ErrorResponse;
import com.pey.meta.contribution.controller.ContributionController;

/**
 * Manejo de errores propio del modulo contribution (sin tocar common).
 * Va antes que GlobalExceptionHandler para que PeyApiException no caiga en el 500 generico.
 */
@RestControllerAdvice(basePackageClasses = ContributionController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ContributionExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ContributionExceptionHandler.class);

    @ExceptionHandler(PeyApiException.class)
    public ResponseEntity<ErrorResponse> handlePey(PeyApiException ex, HttpServletRequest req) {
        log.error("Error con Pey en {} (status={}, type={}, requestId={}): {}", req.getRequestURI(),
                ex.getPeyStatus(), ex.getErrorType(), ex.getRequestId(), ex.getMessage(), ex);
        String message = "No se pudo generar el QR de CoDi con Pey. Intenta de nuevo en unos momentos.";
        if (ex.getRequestId() != null) {
            message += " (requestId " + ex.getRequestId() + ")";
        }
        HttpStatus status = HttpStatus.BAD_GATEWAY;
        return ResponseEntity.status(status)
                .body(ErrorResponse.of(status.value(), status.getReasonPhrase(), message, req.getRequestURI()));
    }
}
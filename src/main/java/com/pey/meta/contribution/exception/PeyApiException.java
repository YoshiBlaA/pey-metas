package com.pey.meta.contribution.exception;

/**
 * Error al llamar a la API de Pey (respuesta de error, falla de red o respuesta incompleta).
 * Se responde 502 en {@link ContributionExceptionHandler}.
 * Pey documenta errores con forma {"error": {"message", "type", "requestId"}}.
 */
public class PeyApiException extends RuntimeException {

    private final Integer peyStatus;
    private final String errorType;
    private final String requestId;

    public PeyApiException(String message, Integer peyStatus, String errorType, String requestId, Throwable cause) {
        super(message, cause);
        this.peyStatus = peyStatus;
        this.errorType = errorType;
        this.requestId = requestId;
    }

    public PeyApiException(String message) {
        this(message, null, null, null, null);
    }

    /** Codigo HTTP que respondio Pey, o null si no hubo respuesta. */
    public Integer getPeyStatus() {
        return peyStatus;
    }

    /** error.type de Pey (por ejemplo INVALID_PARAMETER, SERVICE_UNAVAILABLE), o null. */
    public String getErrorType() {
        return errorType;
    }

    /** error.requestId de Pey para soporte, o null. */
    public String getRequestId() {
        return requestId;
    }
}
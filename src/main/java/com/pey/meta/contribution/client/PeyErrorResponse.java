package com.pey.meta.contribution.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Formato de error documentado por Pey: {"error": {"message", "type", "requestId"}}. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PeyErrorResponse(PeyError error) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PeyError(String message, String type, String requestId) {
    }
}
package com.pey.meta.webhook.service;

/** Lo que se hizo con un aviso de Pey. */
public enum WebhookResult {
    /** Pago nuevo: aportacion marcada PAID y sumada a la meta. */
    PROCESSED,
    /** Ya estaba PAID: no se cuenta otra vez. */
    DUPLICATE,
    /** No existe aportacion con ese numRef: solo se registra en log. */
    UNKNOWN_NUM_REF,
    /** Tipo de evento que no atendemos. */
    IGNORED_EVENT,
    /** Faltan datos (numRef o monto valido): solo se registra en log. */
    INVALID_PAYLOAD
}
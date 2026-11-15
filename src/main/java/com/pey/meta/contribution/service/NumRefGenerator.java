package com.pey.meta.contribution.service;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

/**
 * Genera el numRef que pide Pey: solo digitos, maximo 7 (^[0-9]{1,7}$).
 * Siempre regresa 7 digitos sin cero a la izquierda (1000000..9999999), ~9 millones de valores.
 * La unicidad la garantiza ContributionService con la restriccion unica en BD y reintentos.
 */
@Component
public class NumRefGenerator {

    private static final int MIN = 1_000_000;
    private static final int BOUND = 10_000_000;

    private final SecureRandom random = new SecureRandom();

    public String next() {
        return Integer.toString(MIN + random.nextInt(BOUND - MIN));
    }
}
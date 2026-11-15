package com.pey.meta.goal.service;

import java.util.List;

/**
 * Puente hacia el modulo contribution para contar y listar aportaciones pagadas de una meta.
 * Lo implementa el modulo contribution (con ContributionRepository) como un @Component.
 * Mientras no exista una implementacion, GoalService responde 0 aportaciones y lista vacia.
 * Ver docs/PETICIONES.md.
 */
public interface PaidContributionsProvider {

    /** Numero de aportaciones con estado PAID de la meta. */
    long countPaid(Long goalId);

    /** Ultimas aportaciones PAID de la meta, de la mas reciente a la mas antigua, maximo {@code limit}. */
    List<PaidContributionView> findLatestPaid(Long goalId, int limit);
}
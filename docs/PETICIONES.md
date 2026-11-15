# Peticiones entre bots

Aquí se anotan los cambios que un bot necesita en archivos de otra zona (por ejemplo `pom.xml` o `application.yml`, que son de CimientoBot).
No edites archivos ajenos: escribe la petición aquí, haz commit en tu rama y avísale a Maruchan. CimientoBot las atiende al integrar.

## Plantilla

```
### [AAAA-MM-DD] <Bot> (rama feature/...)
- Archivo / zona afectada:
- Cambio pedido:
- Motivo:
- Estado: PENDIENTE | HECHO | RECHAZADO (motivo)
```

## Peticiones

### [2026-11-15] MetaBot (rama feature/goals)
- Archivo / zona afectada: paquete `contribution` (CobroBot); revisar al integrar (CimientoBot).
- Cambio pedido: crear en `contribution` un `@Component` que implemente `com.pey.meta.goal.service.PaidContributionsProvider` usando `ContributionRepository`. Métodos sugeridos para el repositorio: `long countByGoalIdAndStatus(Long goalId, ContributionStatus status)` y `List<Contribution> findByGoalIdAndStatusOrderByPaidAtDesc(Long goalId, ContributionStatus status, Pageable pageable)` (con `PageRequest.of(0, limit)`), mapeando cada aportación a `PaidContributionView(displayName, anonymous, amount, message, paidAt)`. El nombre "Anónimo" lo pone `GoalMapper`, no hace falta resolverlo en contribution.
- Motivo: el detalle público `GET /api/public/goals/{id}` ya devuelve `paidContributionsCount` y `recentContributions`, pero en `feature/goals` todavía no existe `ContributionRepository`. Mientras no haya implementación, esos campos salen en 0 y lista vacía (no truena). `GoalService` la toma con `ObjectProvider`, así que basta con que exista el bean.
- Estado: PENDIENTE

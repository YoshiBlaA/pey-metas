package com.pey.meta.goal.controller;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;

import com.pey.meta.auth.service.CurrentAdmin;
import com.pey.meta.common.ErrorResponse;
import com.pey.meta.config.OpenApiConfig;
import com.pey.meta.goal.dto.GoalAdminResponse;
import com.pey.meta.goal.dto.GoalMapper;
import com.pey.meta.goal.dto.GoalRequest;
import com.pey.meta.goal.entity.Goal;
import com.pey.meta.goal.entity.GoalStatus;
import com.pey.meta.goal.service.GoalService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/admin/goals")
@Tag(name = "Metas (admin)", description = "Alta, edicion, cierre y reapertura de metas. Requiere JWT de admin.")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@ApiResponse(responseCode = "401", description = "Falta el token o no es valido",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
public class GoalAdminController {

    private final GoalService goalService;
    private final CurrentAdmin currentAdmin;

    public GoalAdminController(GoalService goalService, CurrentAdmin currentAdmin) {
        this.goalService = goalService;
        this.currentAdmin = currentAdmin;
    }

    @PostMapping
    @Operation(summary = "Crear una meta", description = "La meta nace OPEN con raisedAmount en 0.")
    @ApiResponse(responseCode = "201", description = "Meta creada")
    @ApiResponse(responseCode = "400", description = "Datos invalidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<GoalAdminResponse> create(@AuthenticationPrincipal UserDetails user,
                                                    @Valid @RequestBody GoalRequest request) {
        Goal goal = goalService.create(request, currentAdmin.id(user));
        return ResponseEntity.created(URI.create("/api/admin/goals/" + goal.getId()))
                .body(GoalMapper.toAdmin(goal));
    }

    @GetMapping
    @Operation(summary = "Listar mis metas", description = "Solo las del admin autenticado, mas nuevas primero. Filtro opcional por estado.")
    public List<GoalAdminResponse> list(
            @AuthenticationPrincipal UserDetails user,
            @Parameter(description = "OPEN o CLOSED") @RequestParam(required = false) GoalStatus status) {
        return goalService.listForOwner(currentAdmin.id(user), status).stream().map(GoalMapper::toAdmin).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Ver una meta")
    @ApiResponse(responseCode = "200", description = "Meta encontrada")
    @ApiResponse(responseCode = "404", description = "La meta no existe",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public GoalAdminResponse get(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return GoalMapper.toAdmin(goalService.getOwnedOrThrow(id, currentAdmin.id(user)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar una meta",
            description = "Reemplaza titulo, descripcion, meta y montos predeterminados. "
                    + "Si lo recaudado ya alcanza la nueva meta, se cierra. Una meta cerrada sigue cerrada hasta reabrirla.")
    @ApiResponse(responseCode = "200", description = "Meta actualizada")
    @ApiResponse(responseCode = "400", description = "Datos invalidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "La meta no existe",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public GoalAdminResponse update(@AuthenticationPrincipal UserDetails user, @PathVariable Long id,
                                    @Valid @RequestBody GoalRequest request) {
        return GoalMapper.toAdmin(goalService.update(id, currentAdmin.id(user), request));
    }

    @PostMapping("/{id}/close")
    @Operation(summary = "Cerrar una meta", description = "Deja de aceptar aportaciones. Si ya estaba cerrada no cambia nada.")
    @ApiResponse(responseCode = "200", description = "Meta cerrada")
    @ApiResponse(responseCode = "404", description = "La meta no existe",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public GoalAdminResponse close(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return GoalMapper.toAdmin(goalService.close(id, currentAdmin.id(user)));
    }

    @PostMapping("/{id}/reopen")
    @Operation(summary = "Reabrir una meta", description = "Solo si lo recaudado todavia no alcanza la meta.")
    @ApiResponse(responseCode = "200", description = "Meta reabierta")
    @ApiResponse(responseCode = "404", description = "La meta no existe",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "422", description = "Lo recaudado ya alcanza la meta",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public GoalAdminResponse reopen(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return GoalMapper.toAdmin(goalService.reopen(id, currentAdmin.id(user)));
    }
}
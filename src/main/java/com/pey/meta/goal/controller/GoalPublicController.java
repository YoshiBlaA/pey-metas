package com.pey.meta.goal.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pey.meta.common.ErrorResponse;
import com.pey.meta.goal.dto.GoalMapper;
import com.pey.meta.goal.dto.GoalPublicDetailResponse;
import com.pey.meta.goal.dto.GoalPublicSummaryResponse;
import com.pey.meta.goal.entity.GoalStatus;
import com.pey.meta.goal.service.GoalService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/public/goals")
@Tag(name = "Metas (publico)", description = "Lista de metas y detalle con barra de progreso. Sin login.")
public class GoalPublicController {

    private final GoalService goalService;

    public GoalPublicController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping
    @Operation(summary = "Listar metas", description = "Mas nuevas primero. Filtro opcional por estado.")
    public List<GoalPublicSummaryResponse> list(
            @Parameter(description = "OPEN o CLOSED") @RequestParam(required = false) GoalStatus status) {
        return goalService.list(status).stream().map(GoalMapper::toPublicSummary).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle de una meta con progreso",
            description = "Incluye porcentaje, montos predeterminados, numero de aportaciones pagadas y las ultimas "
                    + "aportaciones pagadas. Pensado para que el front lo consulte cada pocos segundos.")
    @ApiResponse(responseCode = "200", description = "Detalle de la meta")
    @ApiResponse(responseCode = "404", description = "La meta no existe",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public GoalPublicDetailResponse detail(
            @PathVariable Long id,
            @Parameter(description = "Cuantas aportaciones recientes traer (1 a 50)")
            @RequestParam(defaultValue = "" + GoalService.DEFAULT_RECENT_LIMIT) int recent) {
        return goalService.getPublicDetail(id, recent);
    }
}
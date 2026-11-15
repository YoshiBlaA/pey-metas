package com.pey.meta.contribution.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pey.meta.common.ErrorResponse;
import com.pey.meta.config.OpenApiConfig;
import com.pey.meta.contribution.dto.AdminContributionResponse;
import com.pey.meta.contribution.dto.ContributionStatsResponse;
import com.pey.meta.contribution.entity.ContributionStatus;
import com.pey.meta.contribution.service.ContributionAdminService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/admin/contributions")
@Tag(name = "Aportaciones (admin)", description = "Lista y conteos de aportaciones en cualquier estado. Requiere JWT de admin.")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@ApiResponse(responseCode = "401", description = "Falta el token o no es valido",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
public class ContributionAdminController {

    private final ContributionAdminService service;

    public ContributionAdminController(ContributionAdminService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar aportaciones",
            description = "Mas nuevas primero, con su estado efectivo (un PENDING vencido sale EXPIRED) y su numRef.")
    public List<AdminContributionResponse> list(
            @Parameter(description = "Solo las de esta meta") @RequestParam(required = false) Long goalId,
            @Parameter(description = "PENDING, PAID o EXPIRED") @RequestParam(required = false) ContributionStatus status,
            @Parameter(description = "Maximo de resultados (1 a 1000)")
            @RequestParam(defaultValue = "" + ContributionAdminService.DEFAULT_LIMIT) int limit) {
        return service.list(goalId, status, limit);
    }

    @GetMapping("/stats")
    @Operation(summary = "Conteos por estado",
            description = "Pagadas, pendientes vigentes, expiradas y lo pagado en los ultimos 7 dias. Sin goalId = todas.")
    public ContributionStatsResponse stats(
            @Parameter(description = "Solo las de esta meta") @RequestParam(required = false) Long goalId) {
        return service.stats(goalId);
    }
}

package com.pey.meta.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pey.meta.auth.dto.LoginRequest;
import com.pey.meta.auth.dto.LoginResponse;
import com.pey.meta.auth.service.AuthService;
import com.pey.meta.common.ErrorResponse;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Login del panel de admin (JWT)")
public class AuthController {

    static final String BAD_CREDENTIALS_MESSAGE = "Usuario o contraseña incorrectos";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login de admin",
            description = "Valida usuario y contraseña y regresa un JWT. Úsalo en Authorization: Bearer <token> "
                    + "para las rutas /api/admin/**.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login correcto"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Credenciales incorrectas",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crear cuenta de admin",
            description = "Cualquiera puede crear su cuenta; cada admin ve y maneja solo sus metas. "
                    + "Regresa un JWT igual que el login.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Cuenta creada"),
            @ApiResponse(responseCode = "400", description = "Datos inv\u00e1lidos",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Ya existe una cuenta con ese correo",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public LoginResponse register(@Valid @RequestBody com.pey.meta.auth.dto.RegisterRequest request) {
        return authService.register(request);
    }

    /** Credenciales incorrectas (o usuario inexistente) en el login: 401 con el formato común. */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex, HttpServletRequest req) {
        HttpStatus status = HttpStatus.UNAUTHORIZED;
        return ResponseEntity.status(status)
                .body(ErrorResponse.of(status.value(), status.getReasonPhrase(), BAD_CREDENTIALS_MESSAGE,
                        req.getRequestURI()));
    }
}
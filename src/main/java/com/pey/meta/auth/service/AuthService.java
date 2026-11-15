package com.pey.meta.auth.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.pey.meta.auth.dto.LoginRequest;
import com.pey.meta.auth.dto.LoginResponse;

/**
 * Login del admin: valida credenciales con el AuthenticationManager y emite el JWT.
 * Con credenciales incorrectas lanza {@link org.springframework.security.core.AuthenticationException}.
 */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
        UserDetails user = (UserDetails) authentication.getPrincipal();
        return LoginResponse.bearer(jwtService.generateToken(user), jwtService.getExpirationSeconds());
    }
}
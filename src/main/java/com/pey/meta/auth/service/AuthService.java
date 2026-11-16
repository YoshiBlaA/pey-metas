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

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final com.pey.meta.auth.repository.AdminUserRepository adminUserRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final org.springframework.security.core.userdetails.UserDetailsService userDetailsService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                       com.pey.meta.auth.repository.AdminUserRepository adminUserRepository,
                       org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                       org.springframework.security.core.userdetails.UserDetailsService userDetailsService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    /**
     * Crea una cuenta de admin (cada admin maneja solo sus metas) y regresa su JWT, asi entra directo.
     * El correo se guarda en minusculas y es el usuario para el login.
     * @throws com.pey.meta.common.BusinessException (409) si ya existe una cuenta con ese correo
     */
    @org.springframework.transaction.annotation.Transactional
    public LoginResponse register(com.pey.meta.auth.dto.RegisterRequest request) {
        String email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (adminUserRepository.existsByUsername(email)) {
            throw com.pey.meta.common.BusinessException.conflict("Ya existe una cuenta con ese correo");
        }
        com.pey.meta.auth.entity.AdminUser admin = new com.pey.meta.auth.entity.AdminUser(email,
                passwordEncoder.encode(request.password()), com.pey.meta.auth.entity.Role.ADMIN);
        admin.setName(request.name().trim());
        adminUserRepository.save(admin);
        log.info("Cuenta de admin creada: {}", email);
        UserDetails user = userDetailsService.loadUserByUsername(email);
        return LoginResponse.bearer(jwtService.generateToken(user), jwtService.getExpirationSeconds());
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
        UserDetails user = (UserDetails) authentication.getPrincipal();
        return LoginResponse.bearer(jwtService.generateToken(user), jwtService.getExpirationSeconds());
    }
}
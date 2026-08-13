package com.portable_health_record_system.controller.auth;

import com.portable_health_record_system.dto.auth.*;
import com.portable_health_record_system.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public OtpResponse register(
            @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/register/verify")
    public AuthResponse verifyRegistration(
            @RequestBody RegisterVerifyRequest request) {
        return authService.verifyRegistration(request);
    }

    @PostMapping("/otp/request")
    public OtpResponse requestOtp(@Valid @RequestBody OtpRequest request) {
        return authService.requestOtp(request);
    }

    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return authService.verifyOtp(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) LogoutRequest request) {
        authService.logout(request == null ? new LogoutRequest(null) : request);
        return ResponseEntity.noContent().build();
    }
}

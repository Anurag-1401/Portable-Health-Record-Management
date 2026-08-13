package com.portable_health_record_system.dto.auth;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        String role,
        String healthId,
        String displayName,
        String refreshToken
) {}

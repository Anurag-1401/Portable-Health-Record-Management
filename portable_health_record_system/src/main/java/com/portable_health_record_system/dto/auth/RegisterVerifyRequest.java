package com.portable_health_record_system.dto.auth;

public record RegisterVerifyRequest(
        String phoneNumber,
        String otp
) {
}
package com.portable_health_record_system.dto.auth;

import java.util.UUID;

import com.portable_health_record_system.common.UserRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(
    @NotBlank(message = "phoneNumber is required")
    @Pattern(regexp = "^\\+?[1-9][0-9]{7,14}$", message = "phoneNumber must be a valid international number")
    String phoneNumber,
    @NotBlank(message = "displayName is required")
    String displayName,
    UserRole role,
    String licenseNumber,
    String specialization,
    UUID hospitalId
) {
}
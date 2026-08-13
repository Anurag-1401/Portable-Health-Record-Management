package com.portable_health_record_system.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpRequest(
        @NotBlank(message = "phoneNumber is required")
        @Pattern(regexp = "^\\+?[1-9][0-9]{7,14}$", message = "phoneNumber must be a valid international number")
        String phoneNumber
) {}

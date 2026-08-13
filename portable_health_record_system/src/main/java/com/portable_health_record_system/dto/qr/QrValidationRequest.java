package com.portable_health_record_system.dto.qr;

import jakarta.validation.constraints.NotBlank;

public record QrValidationRequest(@NotBlank String healthId, String payloadHash) {}

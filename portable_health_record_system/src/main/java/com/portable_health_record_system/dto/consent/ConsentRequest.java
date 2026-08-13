package com.portable_health_record_system.dto.consent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConsentRequest(
        @NotBlank(message = "patientId is required") String patientId,
        @NotBlank(message = "purpose is required") @Size(max = 500) String purpose
) {}

package com.portable_health_record_system.dto.profile;

import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record UpdateProfileRequest(

        @Size(max = 160, message = "displayName cannot exceed 160 characters")
        String displayName,

        // Patient
        String bloodGroup,

        List<Object> allergies,

        List<Object> chronicConditions,

        UUID primaryDoctorId,

        // Doctor
        @Size(max = 160, message = "specialization cannot exceed 160 characters")
        String specialization,

        UUID hospitalId
) {
}

package com.portable_health_record_system.dto.profile;

import java.util.List;
import java.util.UUID;

public record ProfileResponse(
        UUID userId,
        String displayName,
        String phoneNumber,
        String role,
        boolean enabled,

        // Patient fields
        String healthId,
        String bloodGroup,
        List<Object> allergies,
        List<Object> chronicConditions,
        UUID primaryDoctorId,
        String primaryDoctorName,

        // Doctor fields
        String licenseNumber,
        String specialization,
        UUID hospitalId,
        String hospitalName,
        String hospitalRegistrationNumber,
        String hospitalAddress
) {
}
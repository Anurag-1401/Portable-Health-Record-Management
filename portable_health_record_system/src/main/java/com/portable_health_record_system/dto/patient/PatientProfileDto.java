package com.portable_health_record_system.dto.patient;

import java.util.List;
import java.util.UUID;

public record PatientProfileDto(
        UUID userId,
        String phoneNumber,
        String displayName,
        UUID patientId,
        String healthId,
        String bloodGroup,
        List<Object> allergies,
        List<Object> chronicConditions,
        String qrCodePayloadHash,
        UUID primaryDoctorId
) {
}
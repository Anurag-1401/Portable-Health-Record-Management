package com.portable_health_record_system.dto.doctor;

import java.util.UUID;

public record DoctorOptionResponse(
    UUID id,
    String displayName,
    String specialization,
    UUID hospitalId,
    String hospitalName) {
}
package com.portable_health_record_system.dto.hospital;

import java.util.UUID;

public record HospitalDto(
        UUID id,
        String name,
        String registrationNumber,
        String address
) {}

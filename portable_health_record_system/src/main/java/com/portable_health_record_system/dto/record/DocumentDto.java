package com.portable_health_record_system.dto.record;

import java.util.UUID;

public record DocumentDto(
        UUID documentId,
        UUID patientId,
        UUID recordId,
        String fileName,
        String contentType,
        long fileSize,
        String sha256
) {}
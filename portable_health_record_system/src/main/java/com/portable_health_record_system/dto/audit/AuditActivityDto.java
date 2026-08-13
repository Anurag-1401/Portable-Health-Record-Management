package com.portable_health_record_system.dto.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditActivityDto(
        UUID id,
        String action,
        String description,
        Instant createdAt
) {
}
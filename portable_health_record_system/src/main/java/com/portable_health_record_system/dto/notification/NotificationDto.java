package com.portable_health_record_system.dto.notification;

import com.portable_health_record_system.common.NotificationStatus;
import com.portable_health_record_system.common.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        NotificationType type,
        String title,
        String message,
        NotificationStatus status,
        Instant createdAt
) {}

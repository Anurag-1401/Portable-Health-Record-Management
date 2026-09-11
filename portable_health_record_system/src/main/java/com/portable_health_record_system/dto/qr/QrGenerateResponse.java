package com.portable_health_record_system.dto.qr;

import java.time.Instant;

public record QrGenerateResponse(
        String qrUrl,
        Instant expiresAt
) {
}
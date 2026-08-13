package com.portable_health_record_system.dto.qr;

import java.util.UUID;

public record QrValidationResponse(boolean valid, UUID patientId, String healthId) {}

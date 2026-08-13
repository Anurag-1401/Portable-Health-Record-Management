package com.portable_health_record_system.dto.record;

public record HashVerificationResponse(boolean valid, Integer brokenAtIndex, String reason) {}

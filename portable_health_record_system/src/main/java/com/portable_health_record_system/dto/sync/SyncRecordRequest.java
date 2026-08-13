package com.portable_health_record_system.dto.sync;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SyncRecordRequest(
        @NotBlank @JsonProperty("device_id") String deviceId,
        @JsonProperty("target_record_id") UUID targetRecordId,
        @NotNull String operation,
        @NotNull Map<String, Object> payload,
        @NotNull @JsonProperty("created_at_client") Instant createdAtClient
) {}

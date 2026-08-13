package com.portable_health_record_system.dto.sync;

public record SyncRecordResponse(Conflict conflict, String status) {
    public record Conflict(String field_name) {}
}

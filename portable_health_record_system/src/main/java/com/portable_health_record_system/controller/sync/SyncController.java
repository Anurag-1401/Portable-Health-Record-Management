package com.portable_health_record_system.controller.sync;

import com.portable_health_record_system.dto.sync.SyncRecordRequest;
import com.portable_health_record_system.dto.sync.SyncRecordResponse;
import com.portable_health_record_system.service.sync.SyncService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/sync")
public class SyncController {
    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @PostMapping("/record")
    public SyncRecordResponse syncRecord(@Valid @RequestBody SyncRecordRequest request) {
        return syncService.process(request);
    }
}

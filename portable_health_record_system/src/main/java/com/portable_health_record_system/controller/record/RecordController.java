package com.portable_health_record_system.controller.record;

import com.portable_health_record_system.dto.record.HashVerificationResponse;
import com.portable_health_record_system.dto.record.MedicalRecordDto;
import com.portable_health_record_system.dto.record.RecordWriteRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.record.HashChainService;
import com.portable_health_record_system.service.record.RecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/records")
public class RecordController {
    private final RecordService recordService;
    private final CurrentUserService currentUserService;
    private final HashChainService hashChainService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public List<MedicalRecordDto> getMyRecords() {

        User user = currentUserService.requireUser();

        return recordService.getPatientRecordsForUser(user);
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @GetMapping
    public List<MedicalRecordDto> getPatientRecords(@RequestParam String patientId) {
        return recordService.getPatientRecords(patientId);
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @PostMapping
    public MedicalRecordDto create(@Valid @RequestBody RecordWriteRequest request)  {
        User actor = currentUserService.requireUser();
        return recordService.createOrUpdate(request, actor);
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @PutMapping("/{recordId}")
    public MedicalRecordDto update(@PathVariable UUID recordId, @Valid @RequestBody RecordWriteRequest request) {
        User actor = currentUserService.requireUser();
        return recordService.updateById(recordId, request, actor);
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> delete(@PathVariable UUID recordId)  {
        User actor = currentUserService.requireUser();
        recordService.delete(recordId, actor);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @GetMapping("/patient/{patientId}/hash-chain/verify")
    public HashVerificationResponse verifyPatientChain(@PathVariable UUID patientId) {
        return hashChainService.verifyPatientChain(patientId);
    }
}

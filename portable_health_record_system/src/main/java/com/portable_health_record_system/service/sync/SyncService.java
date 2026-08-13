package com.portable_health_record_system.service.sync;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.FhirResourceType;
import com.portable_health_record_system.common.SyncOperation;
import com.portable_health_record_system.common.SyncStatus;
import com.portable_health_record_system.dto.record.RecordWriteRequest;
import com.portable_health_record_system.dto.sync.SyncRecordRequest;
import com.portable_health_record_system.dto.sync.SyncRecordResponse;
import com.portable_health_record_system.entity.auth.SyncQueueEntry;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.entity.record.MedicalRecord;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.BadRequestException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.auth.SyncQueueRepository;
import com.portable_health_record_system.repository.record.MedicalRecordRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;
import com.portable_health_record_system.service.record.RecordService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class SyncService {
    private static final java.util.Set<String> CRITICAL_FIELDS = java.util.Set.of("allergies", "chronic_conditions", "blood_group");
    private final SyncQueueRepository syncQueueRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final CurrentUserService currentUserService;
    private final RecordService recordService;
    private final AuditService auditService;

    public SyncService(SyncQueueRepository syncQueueRepository,
                       MedicalRecordRepository medicalRecordRepository,
                       PatientRepository patientRepository,
                       CurrentUserService currentUserService,
                       RecordService recordService,
                       AuditService auditService) {
        this.syncQueueRepository = syncQueueRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.patientRepository = patientRepository;
        this.currentUserService = currentUserService;
        this.recordService = recordService;
        this.auditService = auditService;
    }

    @Transactional
    public SyncRecordResponse process(SyncRecordRequest request) {
        User actor = currentUserService.requireUser();
        SyncOperation operation = parseOperation(request.operation());
        Patient patient = resolvePatient(request.payload(), actor);
        authorizePatient(actor, patient);

        SyncQueueEntry entry = new SyncQueueEntry();
        entry.setUser(actor);
        entry.setPatient(patient);
        entry.setDeviceId(request.deviceId());
        entry.setTargetRecordId(request.targetRecordId());
        entry.setOperation(operation);
        entry.setPayload(request.payload());
        entry.setStatus(SyncStatus.RECEIVED);
        entry.setCreatedAtClient(request.createdAtClient());
        entry.setReceivedAtServer(Instant.now());
        syncQueueRepository.save(entry);

        MedicalRecord target = request.targetRecordId() == null ? null : medicalRecordRepository.findById(request.targetRecordId())
                .orElseThrow(() -> new ResourceNotFoundException("Target record not found"));
        if (target != null && !target.getPatient().getId().equals(patient.getId())) {
            throw new AccessDeniedBusinessException("Target record does not belong to the resolved patient");
        }

        if (target != null && request.createdAtClient().isBefore(target.getUpdatedAt())) {
            String conflictField = findCriticalField(request.payload());
            if (conflictField != null) {
                entry.setStatus(SyncStatus.CONFLICT);
                entry.setProcessedAt(Instant.now());
                syncQueueRepository.save(entry);
                auditService.log(actor, patient, AuditAction.SYNC_CONFLICT, "Critical field conflict: " + conflictField);
                return new SyncRecordResponse(new SyncRecordResponse.Conflict(conflictField), "conflict");
            }
            entry.setStatus(SyncStatus.APPLIED);
            entry.setProcessedAt(Instant.now());
            syncQueueRepository.save(entry);
            auditService.log(actor, patient, AuditAction.SYNC_RECEIVED, "Older non-critical write ignored by last-write-wins");
            return new SyncRecordResponse(null, "applied");
        }

        FhirResourceType resourceType = resolveResourceType(request.payload(), target);
        Map<String, Object> resourceData = extractResourceData(request.payload());
        Long expectedVersion = target == null ? null : target.getCurrentVersion();
        recordService.createOrUpdate(new RecordWriteRequest(patient.getId(), patient.getHealthId(), resourceType, resourceData, expectedVersion), actor);

        entry.setStatus(SyncStatus.APPLIED);
        entry.setProcessedAt(Instant.now());
        syncQueueRepository.save(entry);
        auditService.log(actor, patient, AuditAction.SYNC_RECEIVED, "Offline write applied");
        return new SyncRecordResponse(null, "applied");
    }

    private SyncOperation parseOperation(String value) {
        try {
            return SyncOperation.valueOf(value);
        } catch (Exception ex) {
            throw new BadRequestException("operation must be insert or update");
        }
    }

    private Patient resolvePatient(Map<String, Object> payload, User actor) {
        Object patientId = payload.get("patient_id");
        if (patientId != null) {
            try {
                return patientRepository.findById(UUID.fromString(String.valueOf(patientId)))
                        .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("patient_id must be a UUID");
            }
        }
        Object healthId = payload.get("healthId");
        if (healthId == null) healthId = payload.get("health_id");
        if (healthId != null) {
            return patientRepository.findByHealthId(String.valueOf(healthId))
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        }
        return patientRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new BadRequestException("patient_id or healthId is required for sync writes"));
    }

    private void authorizePatient(User actor, Patient patient) {
        if (actor.getRole().getName() == com.portable_health_record_system.common.UserRole.admin) return;
        if (actor.getRole().getName() == com.portable_health_record_system.common.UserRole.patient && patient.getUser().getId().equals(actor.getId())) return;
        if (actor.getRole().getName() == com.portable_health_record_system.common.UserRole.doctor && patient.getPrimaryDoctor() != null && patient.getPrimaryDoctor().getUser().getId().equals(actor.getId())) return;
        throw new AccessDeniedBusinessException("User is not authorized to sync this patient's record");
    }

    private String findCriticalField(Map<String, Object> payload) {
        for (String field : CRITICAL_FIELDS) if (payload.containsKey(field)) return field;
        Object nested = payload.get("resource_data");
        if (nested instanceof Map<?, ?> map) {
            for (String field : CRITICAL_FIELDS) if (map.containsKey(field)) return field;
        }
        return null;
    }

    private FhirResourceType resolveResourceType(Map<String, Object> payload, MedicalRecord target) {
        if (target != null) return target.getFhirResourceType();
        Object value = payload.get("fhir_resource_type");
        if (value == null) value = payload.get("resourceType");
        if (value == null) throw new BadRequestException("fhir_resource_type is required for a new record");
        try {
            return FhirResourceType.valueOf(String.valueOf(value));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported FHIR resource type");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractResourceData(Map<String, Object> payload) {
        Object nested = payload.get("resource_data");
        if (nested instanceof Map<?, ?> map) return (Map<String, Object>) map;
        return payload;
    }
}

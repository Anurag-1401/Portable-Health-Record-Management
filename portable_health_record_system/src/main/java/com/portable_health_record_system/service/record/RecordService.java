package com.portable_health_record_system.service.record;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.dto.record.MedicalRecordDto;
import com.portable_health_record_system.dto.record.RecordWriteRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.entity.record.MedicalRecord;
import com.portable_health_record_system.entity.record.RecordVersion;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.BadRequestException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.mapper.RecordMapper;
import com.portable_health_record_system.repository.record.MedicalRecordRepository;
import com.portable_health_record_system.repository.record.RecordVersionRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecordService {
    private final MedicalRecordRepository medicalRecordRepository;
    private final RecordVersionRepository recordVersionRepository;
    private final PatientRepository patientRepository;
    private final RecordMapper recordMapper;
    private final CurrentUserService currentUserService;
    private final HashChainService hashChainService;
    private final AuditService auditService;
    private final com.portable_health_record_system.repository.consent.ConsentRepository consentRepository;

    @Transactional(readOnly = true)
    public List<MedicalRecordDto> getPatientRecordsForUser(User user) {

        Patient patient = patientRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Patient profile not found"
                        ));

        return getPatientRecords(patient.getId().toString());
    }

    @Transactional
    public List<MedicalRecordDto> getPatientRecords(String patientIdentifier) {
        User user = currentUserService.requireUser();
        Patient patient = resolvePatientIdentifier(patientIdentifier);
        UUID patientId = patient.getId();
        authorizeRead(user, patient);
        List<RecordVersion> versions = recordVersionRepository.findByPatientIdOrderByCreatedAtAsc(patientId);
        auditService.log(user, patient, AuditAction.RECORD_READ, "Patient record history read");
        return versions.stream().map(recordMapper::toDto).toList();
    }

    @Transactional
    public MedicalRecordDto createOrUpdate(RecordWriteRequest request, User actor)  {
        Patient patient = resolvePatient(request, actor);
        authorizeWrite(actor, patient);
        Instant now = Instant.now();
        MedicalRecord record = null;
        if (request.expectedVersion() != null) {
            record = medicalRecordRepository.findFirstByPatientIdAndFhirResourceTypeOrderByUpdatedAtDesc(patient.getId(), request.fhirResourceType()).orElse(null);
            if (record == null) throw new ResourceNotFoundException("Record not found for update");
        }

        List<RecordVersion> chain = recordVersionRepository.findByPatientIdOrderByCreatedAtAsc(patient.getId());
        String previousHash = chain.isEmpty() ? null : chain.get(chain.size() - 1).getCurrentRecordHash();
        long nextVersion = record == null ? 1 : record.getCurrentVersion() + 1;
        String currentHash = hashChainService.compute(previousHash, request.resourceData(), now);

        if (record == null) {
            record = new MedicalRecord();
            record.setPatient(patient);
            record.setFhirResourceType(request.fhirResourceType());
            record.setCurrentVersion(nextVersion);
            record.setCreatedAt(now);
            record.setCreatedBy(actor);
        } else {
            if (request.expectedVersion() != null && request.expectedVersion() != record.getCurrentVersion()) {
                throw new BadRequestException("Record version conflict");
            }
            record.setCurrentVersion(nextVersion);
        }
        record.setCurrentRecordHash(currentHash);
        record.setUpdatedAt(now);
        medicalRecordRepository.save(record);

        RecordVersion version = new RecordVersion();
        version.setRecord(record);
        version.setPatient(patient);
        version.setVersionNumber(nextVersion);
        version.setFhirResourceType(request.fhirResourceType());
        version.setResourceData(request.resourceData());
        version.setPreviousRecordHash(previousHash);
        version.setCurrentRecordHash(currentHash);
        version.setCreatedAt(now);
        version.setCreatedBy(actor);
        recordVersionRepository.save(version);
        updateCriticalProfile(patient, request.resourceData());
        patientRepository.save(patient);
        auditService.log(actor, patient, nextVersion == 1 ? AuditAction.RECORD_CREATED : AuditAction.RECORD_UPDATED, "Medical record version " + nextVersion + " stored");
        return recordMapper.toDto(version);
    }

    private Patient resolvePatientIdentifier(String identifier) {
        try {
            UUID id = UUID.fromString(identifier);
            return patientRepository.findById(id)
                    .or(() -> patientRepository.findByUserId(id))
                    .orElseGet(() -> patientRepository.findByHealthId(identifier)
                            .orElseThrow(() -> new ResourceNotFoundException("Patient not found")));
        } catch (IllegalArgumentException ex) {
            return patientRepository.findByHealthId(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        }
    }

    private Patient resolvePatient(RecordWriteRequest request, User actor) {
        if (request.patientId() != null) {
            return patientRepository.findById(request.patientId()).orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        }
        if (request.healthId() != null && !request.healthId().isBlank()) {
            return patientRepository.findByHealthId(request.healthId()).orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        }
        return patientRepository.findByUserId(actor.getId()).orElseThrow(() -> new AccessDeniedBusinessException("A patient identifier is required"));
    }

    private void authorizeRead(User user, Patient patient) {
        switch (user.getRole().getName()) {
            case admin -> { }
            case patient -> {
                if (!patient.getUser().getId().equals(user.getId())) throw new AccessDeniedBusinessException("Patients may only read their own records");
            }
            case doctor -> {
                var doctor = patient.getPrimaryDoctor();
                boolean approved = doctor != null && doctor.getUser().getId().equals(user.getId()) &&
                        consentRepository.findByPatientIdAndStatus(patient.getId(), com.portable_health_record_system.common.ConsentStatus.APPROVED).stream()
                                .anyMatch(c -> c.getDoctor().getUser().getId().equals(user.getId()));
                if (!approved) throw new AccessDeniedBusinessException("Doctor access requires approved patient consent");
            }
            default -> throw new AccessDeniedBusinessException("This role cannot access full medical history");
        }
    }

    private void authorizeWrite(User user, Patient patient) {
        switch (user.getRole().getName()) {
            case admin -> { }
            case patient -> {
                if (!patient.getUser().getId().equals(user.getId())) throw new AccessDeniedBusinessException("Patients may only modify their own records");
            }
            case doctor -> {
                var doctor = patient.getPrimaryDoctor();
                boolean approved = doctor != null && doctor.getUser().getId().equals(user.getId()) &&
                        consentRepository.findByPatientIdAndStatus(patient.getId(), com.portable_health_record_system.common.ConsentStatus.APPROVED).stream()
                                .anyMatch(c -> c.getDoctor().getUser().getId().equals(user.getId()));
                if (!approved) throw new AccessDeniedBusinessException("Doctor write access requires approved patient consent");
            }
            default -> throw new AccessDeniedBusinessException("This role cannot modify medical history");
        }
    }

    @SuppressWarnings("unchecked")
    private void updateCriticalProfile(Patient patient, Map<String, Object> data) {
        if (data.containsKey("blood_group")) patient.setBloodGroup(String.valueOf(data.get("blood_group")));
        if (data.containsKey("allergies") && data.get("allergies") instanceof List<?> list) patient.setAllergies(new ArrayList<>((List<Object>) list));
        if (data.containsKey("chronic_conditions") && data.get("chronic_conditions") instanceof List<?> list) patient.setChronicConditions(new ArrayList<>((List<Object>) list));
    }
    @Transactional
    public MedicalRecordDto updateById(UUID recordId, RecordWriteRequest request, User actor) {
        MedicalRecord existing = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found"));
        if (request.fhirResourceType() != existing.getFhirResourceType()) {
            throw new BadRequestException("FHIR resource type cannot change for an existing record");
        }
        if (!existing.getPatient().getId().equals(resolvePatient(request, actor).getId())) {
            throw new AccessDeniedBusinessException("Record patient does not match request");
        }
        Long expectedVersion = request.expectedVersion() != null ? request.expectedVersion() : existing.getCurrentVersion();
        RecordWriteRequest normalized = new RecordWriteRequest(existing.getPatient().getId(), existing.getPatient().getHealthId(), request.fhirResourceType(), request.resourceData(), expectedVersion);
        return createOrUpdate(normalized, actor);
    }

    @Transactional
    public void delete(UUID recordId, User actor) {
        MedicalRecord existing = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found"));
        authorizeWrite(actor, existing.getPatient());
        Instant now = Instant.now();
        List<RecordVersion> chain = recordVersionRepository.findByPatientIdOrderByCreatedAtAsc(existing.getPatient().getId());
        String previousHash = chain.isEmpty() ? null : chain.get(chain.size() - 1).getCurrentRecordHash();
        Map<String, Object> tombstone = Map.of("resourceType", existing.getFhirResourceType().name(), "deleted", true);
        String currentHash = hashChainService.compute(previousHash, tombstone, now);
        long nextVersion = existing.getCurrentVersion() + 1;
        existing.setCurrentVersion(nextVersion);
        existing.setCurrentRecordHash(currentHash);
        existing.setUpdatedAt(now);
        existing.setDeleted(true);
        medicalRecordRepository.save(existing);
        RecordVersion version = new RecordVersion();
        version.setRecord(existing);
        version.setPatient(existing.getPatient());
        version.setVersionNumber(nextVersion);
        version.setFhirResourceType(existing.getFhirResourceType());
        version.setResourceData(tombstone);
        version.setPreviousRecordHash(previousHash);
        version.setCurrentRecordHash(currentHash);
        version.setCreatedAt(now);
        version.setCreatedBy(actor);
        recordVersionRepository.save(version);
        auditService.log(actor, existing.getPatient(), AuditAction.RECORD_UPDATED, "Medical record tombstoned");
    }

}

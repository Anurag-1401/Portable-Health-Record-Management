package com.portable_health_record_system.service.auth;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.dto.audit.AuditActivityDto;
import com.portable_health_record_system.entity.auth.AuditLog;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.repository.auth.AuditLogRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository auditLogRepository;
    private final PatientRepository patientRepository;

    public void log(User user, Patient patient, AuditAction action, String details) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setPatient(patient);
        log.setAction(action);
        log.setDetails(details);
        log.setCreatedAt(Instant.now());
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
public List<AuditActivityDto> getPatientActivity(User user) {

    Patient patient = patientRepository
            .findByUserId(user.getId())
            .orElseThrow(() ->
                    new IllegalStateException("Patient profile not found"));

    return auditLogRepository
            .findTop20ByPatientIdOrderByCreatedAtDesc(patient.getId())
            .stream()
            .filter(this::isPatientMedicalActivity)
            .limit(20)
            .map(audit -> new AuditActivityDto(
                    audit.getId(),
                    audit.getAction().name(),
                    audit.getDetails(),
                    audit.getCreatedAt()
            ))
            .toList();
}

private boolean isPatientMedicalActivity(AuditLog audit) {

    return switch (audit.getAction()) {

        case RECORD_READ,
             RECORD_CREATED,
             RECORD_UPDATED,
             CONSENT_REQUESTED,
             CONSENT_APPROVED,
             CONSENT_DENIED,
             QR_VALIDATED,
             EMERGENCY_CRITICAL_INFO_READ -> true;

        default -> false;
    };
}
}

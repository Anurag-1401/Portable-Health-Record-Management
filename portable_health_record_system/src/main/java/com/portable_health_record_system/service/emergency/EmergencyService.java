package com.portable_health_record_system.service.emergency;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.UserRole;
import com.portable_health_record_system.dto.emergency.CriticalInfoResponse;
import com.portable_health_record_system.entity.auth.EmergencyAccessLog;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.auth.EmergencyAccessLogRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class EmergencyService {
    private final PatientRepository patientRepository;
    private final EmergencyAccessLogRepository emergencyAccessLogRepository;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    public EmergencyService(PatientRepository patientRepository,
                            EmergencyAccessLogRepository emergencyAccessLogRepository,
                            CurrentUserService currentUserService,
                            AuditService auditService) {
        this.patientRepository = patientRepository;
        this.emergencyAccessLogRepository = emergencyAccessLogRepository;
        this.currentUserService = currentUserService;
        this.auditService = auditService;
    }

    @Transactional
    public CriticalInfoResponse criticalInfo(String healthId) {
        User actor = currentUserService.requireUser();
        if (actor.getRole().getName() != UserRole.emergency_responder && actor.getRole().getName() != UserRole.admin) {
            throw new AccessDeniedBusinessException("Emergency critical information requires emergency responder access");
        }
        Patient patient = patientRepository.findByHealthId(healthId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        EmergencyAccessLog log = new EmergencyAccessLog();
        log.setPatient(patient);
        log.setResponder(actor);
        log.setReason("Critical information lookup");
        log.setCreatedAt(Instant.now());
        emergencyAccessLogRepository.save(log);
        auditService.log(actor, patient, AuditAction.EMERGENCY_CRITICAL_INFO_READ, "Emergency critical information read");
        return new CriticalInfoResponse(
                patient.getBloodGroup(),
                patient.getAllergies().stream().map(this::toAllergy).toList(),
                patient.getChronicConditions().stream().map(this::toCondition).toList());
    }

    @SuppressWarnings("unchecked")
    private CriticalInfoResponse.Allergy toAllergy(Object value) {
        if (value instanceof java.util.Map<?, ?> map) {
            return new CriticalInfoResponse.Allergy(String.valueOf(map.containsKey("allergen") ? map.get("allergen") : "Unknown"), String.valueOf(map.containsKey("severity") ? map.get("severity") : "Unknown"));
        }
        return new CriticalInfoResponse.Allergy(String.valueOf(value), "Unknown");
    }

    private CriticalInfoResponse.Condition toCondition(Object value) {
        if (value instanceof java.util.Map<?, ?> map) {
            return new CriticalInfoResponse.Condition(String.valueOf(map.containsKey("condition") ? map.get("condition") : "Unknown"));
        }
        return new CriticalInfoResponse.Condition(String.valueOf(value));
    }
}

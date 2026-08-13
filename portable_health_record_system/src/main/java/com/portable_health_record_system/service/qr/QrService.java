package com.portable_health_record_system.service.qr;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.UserRole;
import com.portable_health_record_system.dto.qr.QrValidationRequest;
import com.portable_health_record_system.dto.qr.QrValidationResponse;
import com.portable_health_record_system.entity.qr.QrToken;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.repository.qr.QrTokenRepository;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class QrService {
    private final PatientRepository patientRepository;
    private final QrTokenRepository qrTokenRepository;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    public QrService(PatientRepository patientRepository,
                     QrTokenRepository qrTokenRepository,
                     CurrentUserService currentUserService,
                     AuditService auditService) {
        this.patientRepository = patientRepository;
        this.qrTokenRepository = qrTokenRepository;
        this.currentUserService = currentUserService;
        this.auditService = auditService;
    }

    @Transactional
    public QrValidationResponse validate(QrValidationRequest request) {
        var actor = currentUserService.requireUser();
        if (actor.getRole().getName() != UserRole.doctor
                && actor.getRole().getName() != UserRole.emergency_responder
                && actor.getRole().getName() != UserRole.admin) {   
            throw new AccessDeniedBusinessException("QR validation is restricted to clinical or emergency roles");
        }
        var patient = patientRepository.findByHealthId(request.healthId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        boolean valid = request.payloadHash() == null || request.payloadHash().equals(patient.getQrCodePayloadHash());
        if (valid) {
            qrTokenRepository.findByPatientIdAndPayloadHash(patient.getId(), patient.getQrCodePayloadHash()).ifPresent(token -> {
                token.setLastValidatedAt(Instant.now());
                qrTokenRepository.save(token);
            });
            auditService.log(actor, patient, AuditAction.QR_VALIDATED, "QR payload validation: " + valid);
        }
        return new QrValidationResponse(valid, patient.getId(), patient.getHealthId());
    }
}

package com.portable_health_record_system.service.consent;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.ConsentStatus;
import com.portable_health_record_system.common.NotificationType;
import com.portable_health_record_system.dto.consent.ConsentRequest;
import com.portable_health_record_system.dto.consent.ConsentResponse;
import com.portable_health_record_system.dto.consent.DoctorPatientAccessResponse;
import com.portable_health_record_system.dto.consent.PatientConsentRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.consent.Consent;
import com.portable_health_record_system.entity.doctor.Doctor;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.BadRequestException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.exception.UnauthorizedException;
import com.portable_health_record_system.mapper.ConsentMapper;
import com.portable_health_record_system.repository.consent.ConsentRepository;
import com.portable_health_record_system.repository.doctor.DoctorRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;
import com.portable_health_record_system.service.notification.NotificationService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service 
@RequiredArgsConstructor
public class ConsentService {
    private final ConsentRepository consentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final CurrentUserService currentUserService;
    private final ConsentMapper consentMapper;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public ConsentResponse request(ConsentRequest request) {
        User actor = currentUserService.requireUser();
        if (actor.getRole().getName() != com.portable_health_record_system.common.UserRole.doctor && actor.getRole().getName() != com.portable_health_record_system.common.UserRole.admin) {
            throw new AccessDeniedBusinessException("Only doctors can request consent");
        }
        Doctor doctor = doctorRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        Patient patient = resolvePatient(request.patientId());
        if (patient.getPrimaryDoctor() != null && !patient.getPrimaryDoctor().getId().equals(doctor.getId()) && actor.getRole().getName() != com.portable_health_record_system.common.UserRole.admin) {
            throw new AccessDeniedBusinessException("Doctor is not assigned to this patient");
        }
        Consent consent = new Consent();
        consent.setPatient(patient);
        consent.setDoctor(doctor);
        consent.setPurpose(request.purpose());
        consent.setStatus(ConsentStatus.PENDING);
        consent.setRequestedAt(Instant.now());
        consent.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        consentRepository.save(consent);
        notificationService.create(patient.getUser(), NotificationType.CONSENT_REQUEST,
                "Doctor access request", "A doctor requested access for: " + request.purpose());
        auditService.log(actor, patient, AuditAction.CONSENT_REQUESTED, "Consent " + consent.getId() + " requested");
        return consentMapper.toDto(consent);
    }

    @Transactional
    public ConsentResponse approve(UUID consentId) {
        User actor = currentUserService.requireUser();
        Consent consent = consentRepository.findById(consentId)
                .orElseThrow(() -> new ResourceNotFoundException("Consent request not found"));
        if (!consent.getPatient().getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedBusinessException("Only the patient can approve this consent");
        }
        validatePending(consent);
        consent.setStatus(ConsentStatus.APPROVED);
        consent.setRespondedAt(Instant.now());
        consentRepository.save(consent);
        auditService.log(actor, consent.getPatient(), AuditAction.CONSENT_APPROVED, "Consent approved");
        return consentMapper.toDto(consent);
    }

    @Transactional
    public ConsentResponse deny(UUID consentId) {
        User actor = currentUserService.requireUser();
        Consent consent = consentRepository.findById(consentId)
                .orElseThrow(() -> new ResourceNotFoundException("Consent request not found"));
        if (!consent.getPatient().getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedBusinessException("Only the patient can deny this consent");
        }
        validatePending(consent);
        consent.setStatus(ConsentStatus.DENIED);
        consent.setRespondedAt(Instant.now());
        consentRepository.save(consent);
        auditService.log(actor, consent.getPatient(), AuditAction.CONSENT_DENIED, "Consent denied");
        return consentMapper.toDto(consent);
    }

    private Patient resolvePatient(String value) {
        try {
            return patientRepository.findById(UUID.fromString(value)).orElseGet(() -> patientRepository.findByHealthId(value)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found")));
        } catch (IllegalArgumentException ex) {
            return patientRepository.findByHealthId(value)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        }
    }

    private void validatePending(Consent consent) {
        if (consent.getStatus() != ConsentStatus.PENDING) throw new BadRequestException("Consent request is no longer pending");
        if (consent.getExpiresAt() != null && consent.getExpiresAt().isBefore(Instant.now())) {
            consent.setStatus(ConsentStatus.EXPIRED);
            consentRepository.save(consent);
            throw new BadRequestException("Consent request has expired");
        }
    }

    @Transactional(readOnly = true)
public List<ConsentResponse> getPendingRequestsForCurrentPatient() {

    Authentication authentication =
            SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null ||
            authentication.getPrincipal() == null ||
            "anonymousUser".equals(authentication.getPrincipal())) {

        throw new UnauthorizedException(
                "Authentication required"
        );
    }

    String userId = authentication
            .getName();

    UUID userUuid;

    try {
        userUuid = UUID.fromString(userId);
    } catch (IllegalArgumentException e) {
        throw new UnauthorizedException(
                "Invalid authenticated user"
        );
    }

    Patient patient = patientRepository
            .findByUserId(userUuid)
            .orElseThrow(() ->
                    new UnauthorizedException(
                            "Patient profile not found"
                    )
            );

    return consentRepository
            .findByPatientIdAndStatus(
                    patient.getId(),
                    ConsentStatus.PENDING
            )
            .stream()
            .map(consent -> new ConsentResponse(
                    consent.getId(),
                    consent.getPatient().getId(),
                    consent.getDoctor().getId(),
                    consent.getStatus(),
                    consent.getPurpose(),
                    consent.getRequestedAt(),
                    consent.getExpiresAt()
            ))
            .toList();
}

@Transactional
public ConsentResponse getConsentStatus(UUID patientId) {

    User actor = currentUserService.requireUser();

    Doctor doctor = doctorRepository
            .findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Doctor profile not found"
                    )
            );

    Consent consent = consentRepository
            .findFirstByPatientIdAndDoctorIdOrderByRequestedAtDesc(
                    patientId,
                    doctor.getId()
            )
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "No consent request found"
                    )
            );

    /*
     * An APPROVED consent is no longer valid once
     * its expiry time has been reached.
     */
    Instant now = Instant.now();

    if (
            consent.getStatus() == ConsentStatus.APPROVED
            && consent.getExpiresAt() != null
            && !consent.getExpiresAt().isAfter(now)
    ) {
        consent.setStatus(ConsentStatus.EXPIRED);
    }

    return consentMapper.toDto(consent);
}
@Transactional(readOnly = true)
public List<ConsentResponse> getPendingRequestsForCurrentDoctor() {

    User actor = currentUserService.requireUser();

    Doctor doctor = doctorRepository
            .findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException("Doctor profile not found")
            );

    return consentRepository
            .findByDoctorIdAndStatus(
                    doctor.getId(),
                    ConsentStatus.PENDING
            )
            .stream()
            .map(consentMapper::toDto)
            .toList();
}

@Transactional(readOnly = true)
public List<DoctorPatientAccessResponse> getApprovedPatientsForCurrentDoctor() {

    User actor = currentUserService.requireUser();

    Doctor doctor = doctorRepository
            .findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                             "Doctor profile not found"));

    Instant now = Instant.now();

    return consentRepository
            .findByDoctorIdOrderByRequestedAtDesc(doctor.getId())
            .stream()
            .filter(consent -> {

                // Only show approved/expired access records.
                return consent.getStatus() == ConsentStatus.APPROVED
                        || consent.getStatus() == ConsentStatus.EXPIRED;
            })
            .map(consent -> {

                // Automatically mark expired approvals.
                if (
                    consent.getStatus() == ConsentStatus.APPROVED &&
                    consent.getExpiresAt() != null &&
                    !consent.getExpiresAt().isAfter(now)
                ) {
                    consent.setStatus(ConsentStatus.EXPIRED);
                    consentRepository.save(consent);
                }

                Patient patient = consent.getPatient();

                return new DoctorPatientAccessResponse(
            consent.getId(),
            patient.getId(),
            patient.getHealthId(),
            patient.getUser().getDisplayName(),
            consent.getPurpose(),
            consent.getStatus(),
            consent.getRequestedAt(),
            consent.getRespondedAt(),
            consent.getExpiresAt()
    );
            })
            .toList();
}

@Transactional
public ConsentResponse requestByPatient(PatientConsentRequest request) {

    User actor = currentUserService.requireUser();

    if (actor.getRole().getName() != com.portable_health_record_system.common.UserRole.patient) {
        throw new AccessDeniedBusinessException(
                "Only patients can initiate reverse consent"
        );
    }

    Patient patient = patientRepository.findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException("Patient profile not found"));

    UUID doctorId;

    try {
        doctorId = UUID.fromString(request.doctorId().trim());
    } catch (IllegalArgumentException e) {
        throw new BadRequestException("Invalid doctor ID");
    }

    Doctor doctor = doctorRepository.findById(doctorId)
            .orElseThrow(() ->
                    new ResourceNotFoundException("Doctor not found"));

    Consent consent = new Consent();

    consent.setPatient(patient);
    consent.setDoctor(doctor);
    consent.setPurpose(request.purpose());
    consent.setStatus(ConsentStatus.APPROVED);
    consent.setRequestedAt(Instant.now());
    consent.setRespondedAt(Instant.now());
    consent.setExpiresAt(
            Instant.now().plus(24, ChronoUnit.HOURS)
    );

    consentRepository.save(consent);

    auditService.log(
            actor,
            patient,
            AuditAction.CONSENT_APPROVED,
            "Patient granted access to doctor " + doctor.getId()
    );

    return consentMapper.toDto(consent);
}
}

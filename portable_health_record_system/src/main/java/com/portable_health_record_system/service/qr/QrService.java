package com.portable_health_record_system.service.qr;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.UserRole;
import com.portable_health_record_system.dto.qr.DoctorQrValidationRequest;
import com.portable_health_record_system.dto.qr.DoctorQrValidationResponse;
import com.portable_health_record_system.dto.qr.QrGenerateResponse;
import com.portable_health_record_system.dto.qr.QrValidationRequest;
import com.portable_health_record_system.dto.qr.QrValidationResponse;
import com.portable_health_record_system.dto.qr.UniversalQrResponse;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.doctor.Doctor;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.entity.qr.QrToken;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.doctor.DoctorRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.repository.qr.QrTokenRepository;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QrService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final QrTokenRepository qrTokenRepository;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.qr.public-base-url:http://localhost:5173}")
    private String publicBaseUrl;

    @Transactional
    public QrGenerateResponse generatePatientQr() {

        User actor = currentUserService.requireUser();

        if (actor.getRole().getName() != UserRole.patient) {
            throw new AccessDeniedBusinessException(
                    "Only patients can generate patient QR codes"
            );
        }

        Patient patient = patientRepository
                .findByUserId(actor.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Patient profile not found"
                        ));

        qrTokenRepository
        .findByPatientIdAndTokenTypeAndRevokedAtIsNull(
                patient.getId(),
                "PATIENT"
        )
        .forEach(existing -> {
            existing.setRevokedAt(Instant.now());
            qrTokenRepository.save(existing);
        });

        String rawToken = generateRawToken();
        String tokenHash = sha256(rawToken);

        Instant expiresAt =
                Instant.now().plus(30, ChronoUnit.DAYS);

        QrToken token = new QrToken();

        token.setPatient(patient);
        token.setDoctor(null);
        token.setTokenHash(tokenHash);
        token.setPayloadHash(tokenHash);
        token.setTokenType("PATIENT");
        token.setExpiresAt(expiresAt);

        qrTokenRepository.save(token);

        String qrUrl = normalizeBaseUrl()
                + "/qr/patient/"
                + rawToken;

        return new QrGenerateResponse(
                qrUrl,
                expiresAt
        );
    }

    @Transactional
    public QrGenerateResponse generateDoctorQr() {

        User actor = currentUserService.requireUser();

        if (actor.getRole().getName() != UserRole.doctor) {
            throw new AccessDeniedBusinessException(
                    "Only doctors can generate doctor QR codes"
            );
        }

        Doctor doctor = doctorRepository
                .findByUserId(actor.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Doctor profile not found"
                        ));

        // 4.4 Revoke previous doctor QR
qrTokenRepository
        .findByDoctorIdAndTokenTypeAndRevokedAtIsNull(
                doctor.getId(),
                "DOCTOR"
        )
        .forEach(existing -> {
            existing.setRevokedAt(Instant.now());
            qrTokenRepository.save(existing);
        });

        String rawToken = generateRawToken();
        String tokenHash = sha256(rawToken);

        Instant expiresAt =
                Instant.now().plus(30, ChronoUnit.DAYS);

        QrToken token = new QrToken();

        token.setPatient(null);
        token.setDoctor(doctor);
        token.setTokenHash(tokenHash);
        token.setPayloadHash(tokenHash);
        token.setTokenType("DOCTOR");
        token.setExpiresAt(expiresAt);

        qrTokenRepository.save(token);

        String qrUrl = normalizeBaseUrl()
                + "/qr/doctor/"
                + rawToken;

        return new QrGenerateResponse(
                qrUrl,
                expiresAt
        );
    }

    @Transactional
    public UniversalQrResponse resolvePatientQr(String rawToken) {

        QrToken token = resolveToken(rawToken);

        if (!"PATIENT".equals(token.getTokenType())) {
            throw new ResourceNotFoundException(
                    "Invalid patient QR code"
            );
        }

        if (token.getPatient() == null) {
            throw new ResourceNotFoundException(
                    "Patient QR target not found"
            );
        }

        token.setLastValidatedAt(Instant.now());

        Patient patient = token.getPatient();

        return new UniversalQrResponse(
                true,
                "PATIENT",
                patient.getId(),
                patient.getHealthId(),
                null,
                patient.getUser().getDisplayName(),
                null,
                null,
                null,
                token.getExpiresAt()
        );
    }

    @Transactional
    public UniversalQrResponse resolveDoctorQr(String rawToken) {

        QrToken token = resolveToken(rawToken);

        if (!"DOCTOR".equals(token.getTokenType())) {
            throw new ResourceNotFoundException(
                    "Invalid doctor QR code"
            );
        }

        if (token.getDoctor() == null) {
            throw new ResourceNotFoundException(
                    "Doctor QR target not found"
            );
        }

        token.setLastValidatedAt(Instant.now());

        Doctor doctor = token.getDoctor();

        UUID hospitalId = null;
        String hospitalName = null;

        if (doctor.getHospital() != null) {
            hospitalId = doctor.getHospital().getId();
            hospitalName = doctor.getHospital().getName();
        }

        return new UniversalQrResponse(
                true,
                "DOCTOR",
                null,
                null,
                doctor.getId(),
                doctor.getUser().getDisplayName(),
                doctor.getSpecialization(),
                hospitalId,
                hospitalName,
                token.getExpiresAt()
        );
    }

private QrToken resolveToken(String rawToken) {

    if (rawToken == null || rawToken.isBlank()) {
        throw new ResourceNotFoundException(
                "QR token is missing"
        );
    }

    String tokenHash = sha256(rawToken.trim());

    QrToken token = qrTokenRepository
            .findByTokenHash(tokenHash)
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Invalid QR code"
                    ));

    // 4.5 Check if QR was revoked
    if (token.getRevokedAt() != null) {
        throw new ResourceNotFoundException(
                "QR code has been revoked"
        );
    }

    // 4.5 Check if QR has expired
    if (token.getExpiresAt() != null
            && token.getExpiresAt().isBefore(Instant.now())) {

        throw new ResourceNotFoundException(
                "QR code has expired"
        );
    }

    token.setLastValidatedAt(Instant.now());

    return token;
}
    private String generateRawToken() {

        byte[] bytes = new byte[32];

        secureRandom.nextBytes(bytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String sha256(String value) {

        try {

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    value.getBytes(StandardCharsets.UTF_8)
            );

            StringBuilder result = new StringBuilder(64);

            for (byte b : hash) {
                result.append(
                        String.format("%02x", b)
                );
            }

            return result.toString();

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Unable to generate QR hash",
                    e
            );
        }
    }

    private String normalizeBaseUrl() {

        return publicBaseUrl
                .replaceAll("/+$", "");
    }


      @Transactional
    public QrValidationResponse validate(
            QrValidationRequest request
    ) {

        var actor =
                currentUserService.requireUser();

        /*
         * Only doctor, emergency responder and admin
         * are allowed to validate patient QR codes.
         */
        if (
                actor.getRole().getName() != UserRole.doctor
                && actor.getRole().getName() != UserRole.emergency_responder
                && actor.getRole().getName() != UserRole.admin
        ) {
            throw new AccessDeniedBusinessException(
                    "QR validation is restricted to clinical or emergency roles"
            );
        }

        /*
         * Health ID is mandatory.
         */
        if (
                request.healthId() == null
                || request.healthId().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Health ID is required"
            );
        }

        /*
         * Payload hash is mandatory.
         *
         * We do NOT allow a QR without a hash to
         * pass validation.
         */
        if (
                request.payloadHash() == null
                || request.payloadHash().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "QR payload hash is required"
            );
        }

        var patient =
                patientRepository
                        .findByHealthId(
                                request.healthId().trim()
                        )
                        .orElseThrow(
                                () -> new ResourceNotFoundException(
                                        "Patient not found"
                                )
                        );

        /*
         * Compare the scanned QR hash with the
         * hash stored against the patient.
         */
        boolean valid =
                request.payloadHash()
                        .trim()
                        .equalsIgnoreCase(
                                patient.getQrCodePayloadHash()
                        );

        /*
         * Only successful QR validations update
         * the QR token and create an audit entry.
         */
        if (valid) {

            qrTokenRepository
                    .findByPatientIdAndPayloadHash(
                            patient.getId(),
                            patient.getQrCodePayloadHash()
                    )
                    .ifPresent(token -> {

                        token.setLastValidatedAt(
                                Instant.now()
                        );

                        qrTokenRepository.save(token);
                    });

            auditService.log(
                    actor,
                    patient,
                    AuditAction.QR_VALIDATED,
                    "QR payload validation: true"
            );
        }

        return new QrValidationResponse(
                valid,
                patient.getId(),
                patient.getHealthId()
        );
    }

    @Transactional(readOnly = true)
public DoctorQrValidationResponse validateDoctorQr(
        DoctorQrValidationRequest request) {

    var actor = currentUserService.requireUser();

    if (actor.getRole().getName() != UserRole.patient) {
        throw new AccessDeniedBusinessException(
                "Only patients can scan doctor QR codes"
        );
    }

    if (request.doctorId() == null || request.doctorId().isBlank()) {
        throw new IllegalArgumentException(
                "Doctor ID is required"
        );
    }

    UUID doctorId;

    try {
        doctorId = UUID.fromString(request.doctorId().trim());
    } catch (IllegalArgumentException e) {
        throw new IllegalArgumentException(
                "Invalid doctor ID"
        );
    }

    var doctor = doctorRepository
            .findById(doctorId)
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Doctor not found"
                    ));

    var hospital = doctor.getHospital();

    return new DoctorQrValidationResponse(
            doctor.getId(),
            doctor.getUser().getDisplayName(),
            doctor.getSpecialization(),
            hospital != null ? hospital.getId() : null,
            hospital != null ? hospital.getName() : null
    );
}

@Transactional
public void revokePatientQr() {

    User actor = currentUserService.requireUser();

    if (actor.getRole().getName() != UserRole.patient) {
        throw new AccessDeniedBusinessException(
                "Only patients can revoke patient QR codes"
        );
    }

    Patient patient = patientRepository
            .findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Patient profile not found"
                    ));

    Instant now = Instant.now();

    qrTokenRepository
            .findByPatientIdAndTokenTypeAndRevokedAtIsNull(
                    patient.getId(),
                    "PATIENT"
            )
            .forEach(token -> {
                token.setRevokedAt(now);
                qrTokenRepository.save(token);
            });
}

@Transactional
public void revokeDoctorQr() {

    User actor = currentUserService.requireUser();

    if (actor.getRole().getName() != UserRole.doctor) {
        throw new AccessDeniedBusinessException(
                "Only doctors can revoke doctor QR codes"
        );
    }

    Doctor doctor = doctorRepository
            .findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Doctor profile not found"
                    ));

    Instant now = Instant.now();

    qrTokenRepository
            .findByDoctorIdAndTokenTypeAndRevokedAtIsNull(
                    doctor.getId(),
                    "DOCTOR"
            )
            .forEach(token -> {
                token.setRevokedAt(now);
                qrTokenRepository.save(token);
            });
}
} 
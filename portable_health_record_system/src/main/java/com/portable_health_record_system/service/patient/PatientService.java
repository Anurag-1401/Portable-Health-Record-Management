package com.portable_health_record_system.service.patient;

import com.portable_health_record_system.common.ConsentStatus;
import com.portable_health_record_system.dto.patient.PatientProfileDto;
import com.portable_health_record_system.dto.patient.PatientSearchResponse;import com.portable_health_record_system.dto.patient.UpdatePatientProfileRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.doctor.Doctor;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.auth.UserRepository;
import com.portable_health_record_system.repository.consent.ConsentRepository;
import com.portable_health_record_system.repository.doctor.DoctorRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.security.CurrentUserService;

import lombok.RequiredArgsConstructor;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ConsentRepository consentRepository;
    private final DoctorRepository doctorRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public PatientProfileDto getMyProfile(User user) {

        Patient patient = patientRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Patient profile not found"
                        ));

        return new PatientProfileDto(
                user.getId(),
                user.getPhoneNumber(),
                user.getDisplayName(),

                patient.getId(),
                patient.getHealthId(),
                patient.getBloodGroup(),
                patient.getAllergies(),
                patient.getChronicConditions(),
                patient.getQrCodePayloadHash(),

                patient.getPrimaryDoctor() != null
                        ? patient.getPrimaryDoctor().getId()
                        : null
        );
    }

    @Transactional
public PatientProfileDto updateMyProfile(
        User user,
        UpdatePatientProfileRequest request) {

    Patient patient = patientRepository
            .findByUserId(user.getId())
            .orElseThrow(() ->
                    new IllegalStateException("Patient profile not found"));

    // User/account fields
    if (request.displayName() != null) {
        user.setDisplayName(request.displayName());
    }

    // Patient fields
    if (request.bloodGroup() != null) {
        patient.setBloodGroup(request.bloodGroup());
    }

    if (request.allergies() != null) {
        patient.setAllergies(request.allergies());
    }

    if (request.chronicConditions() != null) {
        patient.setChronicConditions(request.chronicConditions());
    }

    userRepository.save(user);
    patientRepository.save(patient);

    /*
     * Always return the COMPLETE profile.
     */
    return new PatientProfileDto(
            user.getId(),
            user.getPhoneNumber(),
            user.getDisplayName(),
            patient.getId(),
            patient.getHealthId(),
            patient.getBloodGroup(),
            patient.getAllergies(),
            patient.getChronicConditions(),
            patient.getQrCodePayloadHash(),
            patient.getPrimaryDoctor() != null ?
                patient.getPrimaryDoctor().getId() : null
    );
}

 @Transactional(readOnly = true)
    public PatientSearchResponse searchByHealthId(String healthId) {

        if (healthId == null || healthId.isBlank()) {
            throw new IllegalArgumentException(
                    "Health ID is required"
            );
        }

        String normalizedHealthId = healthId.trim();

        Patient patient = patientRepository
                .findByHealthId(normalizedHealthId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Patient not found"
                        )
                );

        return new PatientSearchResponse(
                patient.getId(),
                patient.getHealthId(),
                patient.getUser().getDisplayName()
        );
    }


@Transactional(readOnly = true)
public PatientSearchResponse getPatientForDoctor(UUID patientId) {

    User actor = currentUserService.requireUser();

    Doctor doctor = doctorRepository
            .findByUserId(actor.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Doctor profile not found"
                    )
            );

    Patient patient = patientRepository
            .findById(patientId)
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Patient not found"
                    )
            );

    boolean approved = consentRepository
            .existsByPatientIdAndDoctorIdAndStatus(
                    patient.getId(),
                    doctor.getId(),
                    ConsentStatus.APPROVED
            );

    if (!approved) {
        throw new AccessDeniedBusinessException(
                "Patient consent has not been approved"
        );
    }

    return new PatientSearchResponse(
            patient.getId(),
            patient.getHealthId(),
            patient.getUser().getDisplayName()
    );
}
}

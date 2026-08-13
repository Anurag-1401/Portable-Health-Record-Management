package com.portable_health_record_system.service.patient;

import com.portable_health_record_system.dto.patient.PatientProfileDto;
import com.portable_health_record_system.dto.patient.UpdatePatientProfileRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.repository.auth.UserRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

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
}
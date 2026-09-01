package com.portable_health_record_system.service.auth.profile;

import com.portable_health_record_system.common.UserRole;
import com.portable_health_record_system.dto.profile.ProfileResponse;
import com.portable_health_record_system.dto.profile.UpdateProfileRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.doctor.Doctor;
import com.portable_health_record_system.entity.doctor.Hospital;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.exception.UnauthorizedException;
import com.portable_health_record_system.repository.auth.UserRepository;
import com.portable_health_record_system.repository.doctor.DoctorRepository;
// import com.portable_health_record_system.repository.doctor.HospitalRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
//     private final HospitalRepository hospitalRepository;


    // ============================================================
    // GET PROFILE
    // ============================================================

    @Transactional
    public ProfileResponse getMyProfile(UUID userId) {

        User user = getUser(userId);

        UserRole role = user.getRole().getName();

        ProfileResponse baseProfile = new ProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                role.toString(),
                user.isEnabled(),

                null,
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                null,
                null,

                null,
                null,
                null,
                null,
                null,
                null
        );

        if (role == UserRole.patient) {
            return getPatientProfile(user, baseProfile);
        }

        if (role == UserRole.doctor) {
            return getDoctorProfile(user, baseProfile);
        }

        return baseProfile;
    }


    // ============================================================
    // PATIENT PROFILE
    // ============================================================

    private ProfileResponse getPatientProfile(
            User user,
            ProfileResponse base
    ) {

        Patient patient = patientRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Patient profile not found"
                        ));

        UUID primaryDoctorId = null;
        String primaryDoctorName = null;

        if (patient.getPrimaryDoctor() != null) {

            Doctor doctor = patient.getPrimaryDoctor();

            primaryDoctorId = doctor.getId();

            if (doctor.getUser() != null) {
                primaryDoctorName =
                        doctor.getUser().getDisplayName();
            }
        }

        List<Object> allergies =
            patient.getAllergies() != null
                    ? patient.getAllergies()
                    : Collections.emptyList();

    List<Object> chronicConditions =
            patient.getChronicConditions() != null
                    ? patient.getChronicConditions()
                    : Collections.emptyList();

        return new ProfileResponse(
                base.userId(),
                base.displayName(),
                base.phoneNumber(),
                base.role(),
                base.enabled(),

                patient.getHealthId(),
                patient.getBloodGroup(),

                allergies,
                chronicConditions,

                primaryDoctorId,
                primaryDoctorName,

                null,
                null,
                null,
                null,
                null,
                null
        );
    }


    // ============================================================
    // DOCTOR PROFILE
    // ============================================================

    private ProfileResponse getDoctorProfile(
            User user,
            ProfileResponse base
    ) {

        Doctor doctor = doctorRepository
                .findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Doctor profile not found"
                        ));

        UUID hospitalId = null;
        String hospitalName = null;
        String hospitalRegistrationNumber = null;
        String hospitalAddress = null;

        if (doctor.getHospital() != null) {

            Hospital hospital = doctor.getHospital();

            hospitalId = hospital.getId();
            hospitalName = hospital.getName();
            hospitalRegistrationNumber =
                    hospital.getRegistrationNumber();
            hospitalAddress =
                    hospital.getAddress();
        }

        return new ProfileResponse(
                base.userId(),
                base.displayName(),
                base.phoneNumber(),
                base.role(),
                base.enabled(),

                null,
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                null,
                null,

                doctor.getLicenseNumber(),
                doctor.getSpecialization(),

                hospitalId,
                hospitalName,
                hospitalRegistrationNumber,
                hospitalAddress
        );
    }


    // ============================================================
    // UPDATE PROFILE
    // ============================================================

    @Transactional
    public ProfileResponse updateMyProfile(
            UUID userId,
            UpdateProfileRequest request
    ) {

        User user = getUser(userId);

        UserRole role = user.getRole().getName();

        // --------------------------------------------------------
        // Common user fields
        // --------------------------------------------------------

        if (request.displayName() != null) {

            String displayName =
                    request.displayName().trim();

            if (displayName.isBlank()) {
                throw new IllegalArgumentException(
                        "Display name cannot be empty"
                );
            }

            user.setDisplayName(displayName);
        }

        userRepository.save(user);


        // --------------------------------------------------------
        // Patient
        // --------------------------------------------------------

        if (role == UserRole.patient) {

            Patient patient = patientRepository
                    .findByUserId(userId)
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "Patient profile not found"
                            ));

            if (request.bloodGroup() != null) {
                patient.setBloodGroup(
                        request.bloodGroup()
                );
            }

            if (request.allergies() != null) {
                patient.setAllergies(
                        request.allergies()
                );
            }

            if (request.chronicConditions() != null) {
                patient.setChronicConditions(
                        request.chronicConditions()
                );
            }

            if (request.primaryDoctorId() != null) {

                Doctor doctor = doctorRepository
                        .findById(
                                request.primaryDoctorId()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Primary doctor not found"
                                ));

                patient.setPrimaryDoctor(doctor);

            } else {

                patient.setPrimaryDoctor(null);
            }

            patientRepository.save(patient);
        }


        // --------------------------------------------------------
        // Doctor
        // --------------------------------------------------------

        if (role == UserRole.doctor) {

            Doctor doctor = doctorRepository
                    .findByUserId(userId)
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "Doctor profile not found"
                            ));

            if (request.specialization() != null) {

                doctor.setSpecialization(
                        request.specialization().trim()
                );
            }

        //     if (request.hospitalId() != null) {

        //         Hospital hospital = hospitalRepository
        //                 .findById(
        //                         request.hospitalId()
        //                 )
        //                 .orElseThrow(() ->
        //                         new IllegalArgumentException(
        //                                 "Hospital not found"
        //                         ));

        //         doctor.setHospital(hospital);

        //     } else {

        //         doctor.setHospital(null);
        //     }

            doctorRepository.save(doctor);
        }

        return getMyProfile(userId);
    }


    // ============================================================
    // USER
    // ============================================================

    private User getUser(UUID userId) {

        return userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new UnauthorizedException(
                                "User not found"
                        ));
    }
}
package com.portable_health_record_system.controller.docter;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.portable_health_record_system.dto.doctor.DoctorOptionResponse;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.doctor.DoctorRepository;
import com.portable_health_record_system.security.CurrentUserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DocterController {

    private final DoctorRepository doctorRepository;
    private final CurrentUserService currentUserService;

    @GetMapping("/available")
    @PreAuthorize("hasRole('PATIENT')")
    public List<DoctorOptionResponse> getAvailableDoctors() {

        return doctorRepository.findAllWithUserAndHospital()
                .stream()
                .map(doctor -> new DoctorOptionResponse(
                        doctor.getId(),
                        doctor.getUser().getDisplayName(),
                        doctor.getSpecialization(),
                        doctor.getHospital() != null
                                ? doctor.getHospital().getId()
                                : null,
                        doctor.getHospital() != null
                                ? doctor.getHospital().getName()
                                : null
                ))
                .toList();
    }

  @GetMapping("/me")
@PreAuthorize("hasRole('DOCTOR')")
public DoctorOptionResponse getCurrentDoctor() {

    var currentUser = currentUserService.requireUser();

    var doctor = doctorRepository
            .findByUserIdWithUserAndHospital(currentUser.getId())
            .orElseThrow(() ->
                    new ResourceNotFoundException(
                            "Doctor profile not found"
                    ));

    var hospital = doctor.getHospital();

    return new DoctorOptionResponse(
            doctor.getId(),
            doctor.getUser().getDisplayName(),
            doctor.getSpecialization(),
            hospital != null ? hospital.getId() : null,
            hospital != null ? hospital.getName() : null
    );
}
}
package com.portable_health_record_system.controller.patient;

import com.portable_health_record_system.dto.patient.PatientProfileDto;
import com.portable_health_record_system.dto.patient.UpdatePatientProfileRequest;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.patient.PatientService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final CurrentUserService currentUserService;

    @PreAuthorize("hasRole('PATIENT')")
    @GetMapping("/me")
    public PatientProfileDto getMyProfile() {

        User user = currentUserService.requireUser();

        return patientService.getMyProfile(user);
    }
    @PreAuthorize("hasRole('PATIENT')")
    @PutMapping("/me")
    public PatientProfileDto updateMyProfile(
            @Valid @RequestBody UpdatePatientProfileRequest request) {

        User user = currentUserService.requireUser();

        return patientService.updateMyProfile(user, request);
    }
}
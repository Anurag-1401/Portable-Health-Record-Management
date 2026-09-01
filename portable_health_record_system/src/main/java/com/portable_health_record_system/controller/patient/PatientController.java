package com.portable_health_record_system.controller.patient;

import com.portable_health_record_system.dto.patient.PatientProfileDto;
import com.portable_health_record_system.dto.patient.PatientSearchResponse;
import com.portable_health_record_system.dto.patient.UpdatePatientProfileRequest;
import com.portable_health_record_system.dto.record.MedicalRecordDto;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.patient.PatientService;
import com.portable_health_record_system.service.record.RecordService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/patients")
public class PatientController {

private final PatientService patientService;
private final RecordService recordService;
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

    @PreAuthorize("hasRole('DOCTOR') or hasRole('PATIENT')")
    @GetMapping("/search")
    public PatientSearchResponse searchPatient(
            @RequestParam String healthId) {
        return patientService.searchByHealthId(healthId);
    }

     @GetMapping("/{patientId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public PatientSearchResponse getPatientForDoctor(
            @PathVariable UUID patientId
    ) {
        return patientService.getPatientForDoctor(patientId);
    }

     @GetMapping("/{patientId}/records")
    public List<MedicalRecordDto> getPatientRecords(
            @PathVariable UUID patientId
    ) {
        return recordService.getPatientRecords(
                patientId.toString()
        );
    }
}
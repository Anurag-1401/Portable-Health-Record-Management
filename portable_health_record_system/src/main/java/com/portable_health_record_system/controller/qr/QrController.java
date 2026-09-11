package com.portable_health_record_system.controller.qr;

import com.portable_health_record_system.dto.qr.DoctorQrValidationRequest;
import com.portable_health_record_system.dto.qr.DoctorQrValidationResponse;
import com.portable_health_record_system.dto.qr.QrGenerateResponse;
import com.portable_health_record_system.dto.qr.QrValidationRequest;
import com.portable_health_record_system.dto.qr.QrValidationResponse;
import com.portable_health_record_system.dto.qr.UniversalQrResponse;
import com.portable_health_record_system.service.qr.QrService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrService qrService;

    @PostMapping("/patient/generate")
    @PreAuthorize("hasRole('PATIENT')")
    public QrGenerateResponse generatePatientQr() {
        return qrService.generatePatientQr();
    }

    @PostMapping("/doctor/generate")
    @PreAuthorize("hasRole('DOCTOR')")
    public QrGenerateResponse generateDoctorQr() {
        return qrService.generateDoctorQr();
    }

    @GetMapping("/public/patient/{token}")
    public UniversalQrResponse resolvePatientQr(
            @PathVariable String token
    ) {
        return qrService.resolvePatientQr(token);
    }

    @GetMapping("/public/doctor/{token}")
    public UniversalQrResponse resolveDoctorQr(
            @PathVariable String token
    ) {
        return qrService.resolveDoctorQr(token);
    }

     @PreAuthorize("hasAnyRole('DOCTOR', 'EMERGENCY_RESPONDER', 'ADMIN')")
    @PostMapping("/validate")
    public QrValidationResponse validate(@Valid @RequestBody QrValidationRequest request) {
        return qrService.validate(request);
    }

    @PostMapping("/doctor/validate")
@PreAuthorize("hasRole('PATIENT')")
public DoctorQrValidationResponse validateDoctorQr(
        @RequestBody DoctorQrValidationRequest request) {

    return qrService.validateDoctorQr(request);
}

@PostMapping("/patient/revoke")
@PreAuthorize("hasRole('PATIENT')")
public void revokePatientQr() {
    qrService.revokePatientQr();
}

@PostMapping("/doctor/revoke")
@PreAuthorize("hasRole('DOCTOR')")
public void revokeDoctorQr() {
    qrService.revokeDoctorQr();
}
}
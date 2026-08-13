package com.portable_health_record_system.controller.qr;

import com.portable_health_record_system.dto.qr.QrValidationRequest;
import com.portable_health_record_system.dto.qr.QrValidationResponse;
import com.portable_health_record_system.service.qr.QrService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/qr")
public class QrController {
    private final QrService qrService;

    public QrController(QrService qrService) {
        this.qrService = qrService;
    }

    @PreAuthorize("hasAnyRole('DOCTOR', 'EMERGENCY_RESPONDER', 'ADMIN')")
    @PostMapping("/validate")
    public QrValidationResponse validate(@Valid @RequestBody QrValidationRequest request) {
        return qrService.validate(request);
    }
}

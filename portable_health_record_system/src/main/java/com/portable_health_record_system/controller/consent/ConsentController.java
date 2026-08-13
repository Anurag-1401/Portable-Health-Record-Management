package com.portable_health_record_system.controller.consent;

import com.portable_health_record_system.dto.consent.ConsentRequest;
import com.portable_health_record_system.dto.consent.ConsentResponse;
import com.portable_health_record_system.service.consent.ConsentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.UUID;

@RestController
@RequestMapping("/api/consent")
public class ConsentController {
    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @PostMapping("/request")
    public ConsentResponse request(@Valid @RequestBody ConsentRequest request) {
        return consentService.request(request);
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    @PostMapping("/{consentId}/approve")
    public ConsentResponse approve(@PathVariable UUID consentId) {
        return consentService.approve(consentId);
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    @PostMapping("/{consentId}/deny")
    public ConsentResponse deny(@PathVariable UUID consentId) {
        return consentService.deny(consentId);
    }
}

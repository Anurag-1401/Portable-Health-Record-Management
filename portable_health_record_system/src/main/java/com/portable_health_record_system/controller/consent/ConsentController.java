package com.portable_health_record_system.controller.consent;

import com.portable_health_record_system.dto.consent.ConsentRequest;
import com.portable_health_record_system.dto.consent.ConsentResponse;
import com.portable_health_record_system.service.consent.ConsentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
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

    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
@GetMapping("/pending")
public List<ConsentResponse> pendingRequests() {
    return consentService.getPendingRequestsForCurrentPatient();
}

@PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
@GetMapping("/status/{patientId}")
public ConsentResponse getConsentStatus(
        @PathVariable UUID patientId
) {
    return consentService.getConsentStatus(patientId);
}
}

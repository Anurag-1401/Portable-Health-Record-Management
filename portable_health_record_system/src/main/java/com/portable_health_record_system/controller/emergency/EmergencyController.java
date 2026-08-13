package com.portable_health_record_system.controller.emergency;

import com.portable_health_record_system.dto.emergency.CriticalInfoResponse;
import com.portable_health_record_system.service.emergency.EmergencyService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {
    private final EmergencyService emergencyService;

    public EmergencyController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    @PreAuthorize("hasAnyRole('EMERGENCY_RESPONDER', 'ADMIN')")
    @GetMapping("/critical-info/{healthId}")
    public CriticalInfoResponse criticalInfo(@PathVariable String healthId) {
        return emergencyService.criticalInfo(healthId);
    }
}

package com.portable_health_record_system.controller.audit;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.portable_health_record_system.dto.audit.AuditActivityDto;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.auth.AuditService;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public AuditController(
            AuditService auditService,
            CurrentUserService currentUserService) {

        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    @PreAuthorize("hasRole('PATIENT')")
    @GetMapping("/me")
    public List<AuditActivityDto> getMyActivity() {

        User user = currentUserService.requireUser();

        return auditService.getPatientActivity(user);
    }
}
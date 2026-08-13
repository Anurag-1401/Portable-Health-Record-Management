package com.portable_health_record_system.controller.notification;

import com.portable_health_record_system.dto.notification.NotificationDto;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.notification.NotificationService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    public NotificationController(NotificationService notificationService, CurrentUserService currentUserService) {
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<NotificationDto> list() {
        return notificationService.list(currentUserService.requireUserId());
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{notificationId}/read")
    public void markRead(@PathVariable UUID notificationId) {
        notificationService.markRead(notificationId, currentUserService.requireUserId());
    }
}

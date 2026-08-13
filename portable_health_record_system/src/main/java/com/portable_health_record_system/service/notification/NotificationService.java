package com.portable_health_record_system.service.notification;

import com.portable_health_record_system.common.NotificationStatus;
import com.portable_health_record_system.common.NotificationType;
import com.portable_health_record_system.dto.notification.NotificationDto;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.notification.Notification;
import com.portable_health_record_system.mapper.NotificationMapper;
import com.portable_health_record_system.repository.notification.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;

    public NotificationService(NotificationRepository notificationRepository, NotificationMapper notificationMapper) {
        this.notificationRepository = notificationRepository;
        this.notificationMapper = notificationMapper;
    }

    @Transactional
    public Notification create(User recipient, NotificationType type, String title, String message) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setStatus(NotificationStatus.UNREAD);
        notification.setCreatedAt(Instant.now());
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(UUID userId) {
        return notificationRepository.findTop50ByRecipientIdOrderByCreatedAtDesc(userId)
                .stream().map(notificationMapper::toDto).toList();
    }

    @Transactional
    public void markRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (notification.getRecipient().getId().equals(userId)) {
                notification.setStatus(NotificationStatus.READ);
                notificationRepository.save(notification);
            }
        });
    }
}

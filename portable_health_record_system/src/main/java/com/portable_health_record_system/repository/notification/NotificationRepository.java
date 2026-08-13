package com.portable_health_record_system.repository.notification;

import com.portable_health_record_system.entity.notification.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop50ByRecipientIdOrderByCreatedAtDesc(UUID recipientId);
}

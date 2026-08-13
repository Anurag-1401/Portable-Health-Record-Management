package com.portable_health_record_system.entity.notification;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.common.NotificationStatus;
import com.portable_health_record_system.common.NotificationType;
import com.portable_health_record_system.entity.auth.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_recipient", columnList = "recipient_id,created_at"),
        @Index(name = "idx_notifications_unread", columnList = "recipient_id,status")
})
@Getter @Setter @NoArgsConstructor
public class Notification extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", nullable = false, length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private NotificationStatus status = NotificationStatus.UNREAD;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

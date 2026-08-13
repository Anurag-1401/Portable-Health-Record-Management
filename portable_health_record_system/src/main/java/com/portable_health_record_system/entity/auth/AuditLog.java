package com.portable_health_record_system.entity.auth;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_logs_user_time", columnList = "user_id,created_at"),
        @Index(name = "idx_audit_logs_patient_time", columnList = "patient_id,created_at"),
        @Index(name = "idx_audit_logs_action", columnList = "action")
})
@Getter @Setter @NoArgsConstructor
public class AuditLog extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    private AuditAction action;

    @Column(name = "details", length = 2000)
    private String details;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

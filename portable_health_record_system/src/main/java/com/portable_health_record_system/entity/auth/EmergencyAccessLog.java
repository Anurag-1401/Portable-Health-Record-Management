package com.portable_health_record_system.entity.auth;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "emergency_access_logs", indexes = {
        @Index(name = "idx_emergency_logs_patient", columnList = "patient_id,created_at"),
        @Index(name = "idx_emergency_logs_responder", columnList = "responder_id,created_at")
})
@Getter @Setter @NoArgsConstructor
public class EmergencyAccessLog extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responder_id", nullable = false)
    private User responder;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

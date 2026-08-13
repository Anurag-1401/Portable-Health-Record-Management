package com.portable_health_record_system.entity.auth;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.common.SyncOperation;
import com.portable_health_record_system.common.SyncStatus;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sync_queue", indexes = {
        @Index(name = "idx_sync_queue_status", columnList = "status,received_at_server"),
        @Index(name = "idx_sync_queue_record", columnList = "target_record_id")
})
@Getter @Setter @NoArgsConstructor
public class SyncQueueEntry extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(name = "device_id", nullable = false, length = 200)
    private String deviceId;

    @Column(name = "target_record_id")
    private UUID targetRecordId;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation", nullable = false, length = 20)
    private SyncOperation operation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb", nullable = false)
    private Object payload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SyncStatus status;

    @Column(name = "created_at_client", nullable = false)
    private Instant createdAtClient;

    @Column(name = "received_at_server", nullable = false)
    private Instant receivedAtServer;

    @Column(name = "processed_at")
    private Instant processedAt;
}

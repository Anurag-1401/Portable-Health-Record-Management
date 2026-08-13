package com.portable_health_record_system.entity.qr;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "qr_tokens", indexes = {
        @Index(name = "idx_qr_tokens_patient", columnList = "patient_id"),
        @Index(name = "idx_qr_tokens_payload_hash", columnList = "payload_hash")
})
@Getter @Setter @NoArgsConstructor
public class QrToken extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "last_validated_at")
    private Instant lastValidatedAt;
}

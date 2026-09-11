package com.portable_health_record_system.entity.qr;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.doctor.Doctor;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "qr_tokens")
@Getter
@Setter
@NoArgsConstructor
public class QrToken extends EntityBase {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Column(name = "token_hash", unique = true, length = 64)
    private String tokenHash;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "token_type", length = 20)
    private String tokenType;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "last_validated_at")
    private Instant lastValidatedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}
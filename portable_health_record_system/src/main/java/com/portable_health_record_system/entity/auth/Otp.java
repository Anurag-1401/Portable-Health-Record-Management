package com.portable_health_record_system.entity.auth;

import com.portable_health_record_system.common.EntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "otp", indexes = @Index(name = "idx_otp_phone_created", columnList = "phone_number,created_at"))
@Getter @Setter @NoArgsConstructor
public class Otp extends EntityBase {
    @Column(name = "phone_number", nullable = false, length = 32)
    private String phoneNumber;

    @Column(name = "otp_hash", nullable = false, length = 100)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "consumed", nullable = false)
    private boolean consumed;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

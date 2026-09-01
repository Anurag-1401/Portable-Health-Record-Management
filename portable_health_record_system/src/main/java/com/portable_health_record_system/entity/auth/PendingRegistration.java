package com.portable_health_record_system.entity.auth;

import com.portable_health_record_system.common.UserRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "pending_registrations")
public class PendingRegistration {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "phone_number", nullable = false, unique = true)
    private String phoneNumber;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "license_number", length = 100)
private String licenseNumber;

@Column(name = "specialization", length = 160)
private String specialization;

@Column(name = "hospital_id")
private UUID hospitalId;
}
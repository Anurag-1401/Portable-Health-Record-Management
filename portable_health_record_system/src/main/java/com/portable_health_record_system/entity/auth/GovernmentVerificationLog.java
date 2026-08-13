package com.portable_health_record_system.entity.auth;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "government_verification_logs", indexes = {
        @Index(name = "idx_gov_logs_patient", columnList = "patient_id,created_at"),
        @Index(name = "idx_gov_logs_verifier", columnList = "verifier_id,created_at")
})
@Getter @Setter @NoArgsConstructor
public class GovernmentVerificationLog extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "verifier_id", nullable = false)
    private User verifier;

    @Column(name = "eligibility_result", length = 1000)
    private String eligibilityResult;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

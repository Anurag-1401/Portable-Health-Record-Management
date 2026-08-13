package com.portable_health_record_system.entity.record;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.common.FhirResourceType;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "medical_records", indexes = {
        @Index(name = "idx_medical_records_patient", columnList = "patient_id"),
        @Index(name = "idx_medical_records_patient_type", columnList = "patient_id,fhir_resource_type"),
        @Index(name = "idx_medical_records_updated", columnList = "updated_at")
})
@Getter @Setter @NoArgsConstructor
public class MedicalRecord extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Enumerated(EnumType.STRING)
    @Column(name = "fhir_resource_type", nullable = false, length = 40)
    private FhirResourceType fhirResourceType;

    @Column(name = "current_version", nullable = false)
    private long currentVersion = 0;

    @Column(name = "current_record_hash", nullable = false, length = 64)
    private String currentRecordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Version
    @Column(name = "lock_version", nullable = false)
    private long lockVersion;
}

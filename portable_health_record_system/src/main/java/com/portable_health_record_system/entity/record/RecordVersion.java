package com.portable_health_record_system.entity.record;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.common.FhirResourceType;
import com.portable_health_record_system.entity.auth.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "record_versions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_record_version_number", columnNames = {"record_id", "version_number"})
}, indexes = {
        @Index(name = "idx_record_versions_record", columnList = "record_id"),
        @Index(name = "idx_record_versions_patient", columnList = "patient_id")
})
@Getter @Setter @NoArgsConstructor
public class RecordVersion extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id", nullable = false)
    private MedicalRecord record;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private com.portable_health_record_system.entity.patient.Patient patient;

    @Column(name = "version_number", nullable = false)
    private long versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "fhir_resource_type", nullable = false, length = 40)
    private FhirResourceType fhirResourceType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resource_data", columnDefinition = "jsonb", nullable = false)
    private Object resourceData;

    @Column(name = "previous_record_hash", length = 64)
    private String previousRecordHash;

    @Column(name = "current_record_hash", nullable = false, length = 64)
    private String currentRecordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}

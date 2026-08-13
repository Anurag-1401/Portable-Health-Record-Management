package com.portable_health_record_system.entity.record;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.patient.Patient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "documents", indexes = @Index(name = "idx_documents_patient", columnList = "patient_id"))
@Getter @Setter @NoArgsConstructor
public class Document extends EntityBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "storage_key", nullable = false, unique = true, length = 500)
    private String storageKey;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;
}

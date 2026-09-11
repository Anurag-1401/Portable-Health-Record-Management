package com.portable_health_record_system.repository.record;

import com.portable_health_record_system.entity.record.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository
        extends JpaRepository<Document, UUID> {

    List<Document> findByPatientIdOrderByIdDesc(UUID patientId);

    List<Document> findByRecordIdOrderByIdDesc(UUID recordId);

    List<Document> findByPatientIdAndRecordIdOrderByIdDesc(
            UUID patientId,
            UUID recordId
    );
}

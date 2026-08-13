package com.portable_health_record_system.repository.record;

import com.portable_health_record_system.entity.record.RecordVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RecordVersionRepository extends JpaRepository<RecordVersion, UUID> {
    List<RecordVersion> findByRecordIdOrderByVersionNumberAsc(UUID recordId);
    List<RecordVersion> findByPatientIdOrderByCreatedAtAsc(UUID patientId);
}

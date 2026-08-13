package com.portable_health_record_system.repository.record;

import com.portable_health_record_system.entity.record.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {
    List<MedicalRecord> findByPatientIdOrderByUpdatedAtDesc(UUID patientId);
    Optional<MedicalRecord> findFirstByPatientIdAndFhirResourceTypeOrderByUpdatedAtDesc(UUID patientId, com.portable_health_record_system.common.FhirResourceType resourceType);
}

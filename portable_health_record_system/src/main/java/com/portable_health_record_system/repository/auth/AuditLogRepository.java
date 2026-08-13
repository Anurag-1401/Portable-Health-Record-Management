package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.entity.auth.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findTop20ByPatientIdOrderByCreatedAtDesc(UUID patientId);
}

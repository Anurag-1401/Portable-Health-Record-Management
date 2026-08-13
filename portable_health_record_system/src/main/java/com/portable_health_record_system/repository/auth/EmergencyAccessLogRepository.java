package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.entity.auth.EmergencyAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EmergencyAccessLogRepository extends JpaRepository<EmergencyAccessLog, UUID> {
}

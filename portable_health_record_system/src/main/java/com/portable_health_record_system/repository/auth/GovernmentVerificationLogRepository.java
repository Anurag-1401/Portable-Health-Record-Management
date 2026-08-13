package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.entity.auth.GovernmentVerificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GovernmentVerificationLogRepository extends JpaRepository<GovernmentVerificationLog, UUID> {
}

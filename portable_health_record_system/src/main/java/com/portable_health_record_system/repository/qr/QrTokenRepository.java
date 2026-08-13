package com.portable_health_record_system.repository.qr;

import com.portable_health_record_system.entity.qr.QrToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QrTokenRepository extends JpaRepository<QrToken, UUID> {
    Optional<QrToken> findByPatientIdAndPayloadHash(UUID patientId, String payloadHash);
}

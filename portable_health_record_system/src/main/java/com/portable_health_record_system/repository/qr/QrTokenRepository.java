package com.portable_health_record_system.repository.qr;

import com.portable_health_record_system.entity.qr.QrToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QrTokenRepository
        extends JpaRepository<QrToken, UUID> {

    Optional<QrToken> findByTokenHash(String tokenHash);

    Optional<QrToken> findByPatientIdAndPayloadHash(
            UUID patientId,
            String payloadHash
    );

    Optional<QrToken> findFirstByPatientIdAndTokenTypeOrderByExpiresAtDesc(
            UUID patientId,
            String tokenType
    );

    Optional<QrToken> findFirstByDoctorIdAndTokenTypeOrderByExpiresAtDesc(
            UUID doctorId,
            String tokenType
    );

    List<QrToken> findByPatientIdAndTokenTypeAndRevokedAtIsNull(
            UUID patientId,
            String tokenType
    );

    List<QrToken> findByDoctorIdAndTokenTypeAndRevokedAtIsNull(
            UUID doctorId,
            String tokenType
    );
}
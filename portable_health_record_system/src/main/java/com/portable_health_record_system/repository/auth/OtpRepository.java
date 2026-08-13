package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.entity.auth.Otp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OtpRepository extends JpaRepository<Otp, UUID> {
    Optional<Otp> findTopByPhoneNumberAndConsumedFalseOrderByCreatedAtDesc(String phoneNumber);
}

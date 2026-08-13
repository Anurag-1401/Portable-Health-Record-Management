package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.entity.auth.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PendingRegistrationRepository
        extends JpaRepository<PendingRegistration, UUID> {

    Optional<PendingRegistration> findByPhoneNumber(String phoneNumber);

    void deleteByPhoneNumber(String phoneNumber);
}
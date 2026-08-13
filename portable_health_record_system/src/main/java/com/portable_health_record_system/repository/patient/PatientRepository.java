package com.portable_health_record_system.repository.patient;

import com.portable_health_record_system.entity.patient.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {
    Optional<Patient> findByHealthId(String healthId);
    Optional<Patient> findByUserId(UUID userId);
}

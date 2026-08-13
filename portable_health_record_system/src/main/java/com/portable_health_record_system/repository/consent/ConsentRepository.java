package com.portable_health_record_system.repository.consent;

import com.portable_health_record_system.common.ConsentStatus;
import com.portable_health_record_system.entity.consent.Consent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConsentRepository extends JpaRepository<Consent, UUID> {
    List<Consent> findByPatientIdAndStatus(UUID patientId, ConsentStatus status);
    List<Consent> findByDoctorIdAndStatus(UUID doctorId, ConsentStatus status);
}

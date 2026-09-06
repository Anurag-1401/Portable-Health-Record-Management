package com.portable_health_record_system.repository.hospital;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.portable_health_record_system.entity.doctor.Hospital;


public interface HospitalRepository
        extends JpaRepository<Hospital, UUID> {

    List<Hospital> findByPincodeOrderByNameAsc(String pincode);
}
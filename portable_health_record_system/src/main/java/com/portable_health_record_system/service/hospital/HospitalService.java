package com.portable_health_record_system.service.hospital;

import com.portable_health_record_system.dto.hospital.HospitalResponse;
import com.portable_health_record_system.entity.doctor.Hospital;
import com.portable_health_record_system.repository.hospital.HospitalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HospitalService {

    private final HospitalRepository hospitalRepository;

    public List<HospitalResponse> getHospitalsByPincode(String pincode) {

        String cleanedPincode = pincode == null
                ? ""
                : pincode.trim();

        if (cleanedPincode.isEmpty()) {
            return List.of();
        }

        return hospitalRepository
                .findByPincodeOrderByNameAsc(cleanedPincode)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private HospitalResponse toResponse(Hospital hospital) {
        return new HospitalResponse(
                hospital.getId(),
                hospital.getName(),
                hospital.getRegistrationNumber(),
                hospital.getAddress(),
                hospital.getPincode()
        );
    }
}
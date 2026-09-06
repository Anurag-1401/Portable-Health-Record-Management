package com.portable_health_record_system.controller.hospital;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.portable_health_record_system.dto.hospital.HospitalResponse;
import com.portable_health_record_system.service.hospital.HospitalService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalService hospitalService;

    @GetMapping("/search")
    public List<HospitalResponse> searchHospitals(
            @RequestParam String pincode) {

        return hospitalService.getHospitalsByPincode(pincode);
    }
}

package com.portable_health_record_system.dto.patient;

import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdatePatientProfileRequest(

        @Size(max = 100)
        String displayName,

        String bloodGroup,

        List<Object> allergies,

        List<Object> chronicConditions

) {
}
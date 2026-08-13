package com.portable_health_record_system.mapper;

import com.portable_health_record_system.dto.consent.ConsentResponse;
import com.portable_health_record_system.entity.consent.Consent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ConsentMapper {
    @Mapping(target = "consentId", source = "id")
    @Mapping(target = "patientId", source = "patient.id")
    @Mapping(target = "doctorId", source = "doctor.id")
    ConsentResponse toDto(Consent source);
}

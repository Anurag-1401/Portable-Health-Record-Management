package com.portable_health_record_system.mapper;

import com.portable_health_record_system.dto.record.MedicalRecordDto;
import com.portable_health_record_system.entity.record.RecordVersion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RecordMapper {
    @Mapping(target = "record_id", source = "record.id")
    @Mapping(target = "patient_id", source = "patient.id")
    @Mapping(target = "fhir_resource_type", expression = "java(source.getFhirResourceType().name())")
    @Mapping(target = "version_number", source = "versionNumber")
    @Mapping(target = "resource_data", source = "resourceData")
    @Mapping(target = "previous_record_hash", source = "previousRecordHash")
    @Mapping(target = "current_record_hash", source = "currentRecordHash")
    @Mapping(target = "created_at", source = "createdAt")
    @Mapping(target = "updated_at", expression = "java(source.getRecord().getUpdatedAt())")
    MedicalRecordDto toDto(RecordVersion source);
}

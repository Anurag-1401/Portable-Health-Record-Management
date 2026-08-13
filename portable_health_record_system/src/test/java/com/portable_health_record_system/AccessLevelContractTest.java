package com.portable_health_record_system;

import com.portable_health_record_system.common.FhirResourceType;
import com.portable_health_record_system.common.UserRole;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AccessLevelContractTest {
    @Test
    void frontendRoleValuesRemainStable() {
        assertEquals("patient", UserRole.patient.name());
        assertEquals("doctor", UserRole.doctor.name());
        assertEquals("emergency_responder", UserRole.emergency_responder.name());
        assertEquals("government_verifier", UserRole.government_verifier.name());
        assertEquals("admin", UserRole.admin.name());
        assertEquals("Patient", FhirResourceType.Patient.name());
        assertEquals("Observation", FhirResourceType.Observation.name());
        assertEquals("Condition", FhirResourceType.Condition.name());
        assertEquals("MedicationRequest", FhirResourceType.MedicationRequest.name());
    }
}

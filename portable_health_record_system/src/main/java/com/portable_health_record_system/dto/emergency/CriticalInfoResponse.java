package com.portable_health_record_system.dto.emergency;

import java.util.List;

public record CriticalInfoResponse(
        String blood_group,
        List<Allergy> allergies,
        List<Condition> chronic_conditions
) {
    public record Allergy(String allergen, String severity) {}
    public record Condition(String condition) {}
}

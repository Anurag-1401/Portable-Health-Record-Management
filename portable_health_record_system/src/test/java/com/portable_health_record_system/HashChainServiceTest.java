package com.portable_health_record_system;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portable_health_record_system.service.record.HashChainService;
import com.portable_health_record_system.util.CanonicalJson;
import com.portable_health_record_system.util.HashUtil;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HashChainServiceTest {
    @Test
    void canonicalHashMatchesFrontendFormula() {
        var mapper = new ObjectMapper();
        var canonicalJson = new CanonicalJson(mapper);
        var repository = Mockito.mock(com.portable_health_record_system.repository.record.RecordVersionRepository.class);
        var service = new HashChainService(canonicalJson, repository);
        var data = Map.of("z", "last", "a", Map.of("b", 2, "a", 1));
        Instant createdAt = Instant.parse("2026-08-01T10:00:00Z");
        String expected = HashUtil.sha256Hex("{\"a\":{\"a\":1,\"b\":2},\"z\":\"last\"}" + createdAt);
        assertEquals(expected, service.compute(null, data, createdAt));
    }
}
package com.portable_health_record_system.service.record;

import com.portable_health_record_system.dto.record.HashVerificationResponse;
import com.portable_health_record_system.entity.record.RecordVersion;
import com.portable_health_record_system.repository.record.RecordVersionRepository;
import com.portable_health_record_system.util.CanonicalJson;
import com.portable_health_record_system.util.HashUtil;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class HashChainService {
    private final CanonicalJson canonicalJson;
    private final RecordVersionRepository recordVersionRepository;

    public HashChainService(CanonicalJson canonicalJson, RecordVersionRepository recordVersionRepository){
        this.canonicalJson = canonicalJson;
        this.recordVersionRepository = recordVersionRepository;
    }

    public String compute(String previousHash, Object resourceData, Instant createdAt){
        String payload = (previousHash == null ? "" : previousHash)
                + canonicalJson.canonicalize(resourceData)
                + createdAt.toString();
        return HashUtil.sha256Hex(payload);
    }

    public HashVerificationResponse verifyPatientChain(java.util.UUID patientId) {
        List<RecordVersion> versions = recordVersionRepository.findByPatientIdOrderByCreatedAtAsc(patientId);
        String expectedPrevious = null;
        for (int i = 0; i < versions.size(); i++) {
            RecordVersion version = versions.get(i);
            if (!java.util.Objects.equals(expectedPrevious, version.getPreviousRecordHash())) {
                return new HashVerificationResponse(false, i, "previous_hash_mismatch");
            }
            String recomputed = compute(version.getPreviousRecordHash(), version.getResourceData(), version.getCreatedAt());
            if (!recomputed.equals(version.getCurrentRecordHash())) {
                return new HashVerificationResponse(false, i, "hash_mismatch");
            }
            expectedPrevious = version.getCurrentRecordHash();
        }
        return new HashVerificationResponse(true, null, null);
    }
}

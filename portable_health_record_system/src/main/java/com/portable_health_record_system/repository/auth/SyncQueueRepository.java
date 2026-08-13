package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.common.SyncStatus;
import com.portable_health_record_system.entity.auth.SyncQueueEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SyncQueueRepository extends JpaRepository<SyncQueueEntry, UUID> {
    List<SyncQueueEntry> findByStatusOrderByReceivedAtServerAsc(SyncStatus status);
}

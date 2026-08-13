package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.common.UserRole;
import com.portable_health_record_system.entity.auth.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(UserRole name);
}

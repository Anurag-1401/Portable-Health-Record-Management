package com.portable_health_record_system.repository.auth;

import com.portable_health_record_system.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByPhoneNumber(String phoneNumber);
    @Query("""
        SELECT u
        FROM User u
        JOIN FETCH u.role
        WHERE u.id = :id
    """)
    Optional<User> findByIdWithRole(@Param("id") UUID id);
}

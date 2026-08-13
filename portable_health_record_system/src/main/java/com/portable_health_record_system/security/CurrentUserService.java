package com.portable_health_record_system.security;

import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.auth.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class CurrentUserService {
    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UUID requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required");
        }
        return userId;
    }

    public User requireUser() {
        return userRepository.findById(requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}

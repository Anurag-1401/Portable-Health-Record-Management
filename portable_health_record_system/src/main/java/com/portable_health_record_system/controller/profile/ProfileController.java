package com.portable_health_record_system.controller.profile;

import com.portable_health_record_system.dto.profile.ProfileResponse;
import com.portable_health_record_system.dto.profile.UpdateProfileRequest;
import com.portable_health_record_system.service.auth.profile.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;


    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile(
            Authentication authentication
    ) {

        UUID userId = extractUserId(authentication);

        return ResponseEntity.ok(
                profileService.getMyProfile(userId)
        );
    }


    @PatchMapping("/me")
    public ResponseEntity<ProfileResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request
    ) {

        UUID userId = extractUserId(authentication);

        return ResponseEntity.ok(
                profileService.updateMyProfile(
                        userId,
                        request
                )
        );
    }


    private UUID extractUserId(
            Authentication authentication
    ) {

        if (authentication == null ||
                authentication.getName() == null) {

            throw new IllegalStateException(
                    "Authenticated user not found"
            );
        }

        return UUID.fromString(
                authentication.getName()
        );
    }
}
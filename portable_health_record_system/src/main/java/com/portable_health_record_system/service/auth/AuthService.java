package com.portable_health_record_system.service.auth;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.UserRole;
import com.portable_health_record_system.dto.auth.*;
import com.portable_health_record_system.entity.auth.Otp;
import com.portable_health_record_system.entity.auth.RefreshToken;
import com.portable_health_record_system.entity.auth.Role;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.exception.UnauthorizedException;
import com.portable_health_record_system.repository.auth.OtpRepository;
import com.portable_health_record_system.repository.auth.PendingRegistrationRepository;
import com.portable_health_record_system.repository.auth.RefreshTokenRepository;
import com.portable_health_record_system.repository.auth.RoleRepository;
import com.portable_health_record_system.repository.auth.UserRepository;
import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.security.JwtService;
import com.portable_health_record_system.util.HashUtil;
import com.portable_health_record_system.util.PhoneNumberUtil;
import com.portable_health_record_system.entity.auth.PendingRegistration;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final RoleRepository roleRepository;
    private final OtpRepository otpRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpDeliveryService otpDeliveryService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final PendingRegistrationRepository pendingRegistrationRepository;


    @Value("${app.otp.ttl-minutes}")
    private long otpTtlMinutes;

    @Value("${app.otp.max-attempts}")
    private int maxOtpAttempts;

    @Value("${app.otp.expose-in-response}")
    private boolean exposeOtp;

    @Value("${app.jwt.refresh-ttl-days}")
    private long refreshTtlDays;


   @Transactional
public OtpResponse register(RegisterRequest request) {

    String phone = PhoneNumberUtil.normalize(request.phoneNumber());

    if (userRepository.findByPhoneNumber(phone).isPresent()) {
        throw new IllegalArgumentException(
                "An account already exists for this phone number"
        );
    }

    if (request.role() == null) {
        throw new IllegalArgumentException("Role is required");
    }

    roleRepository.findByName(request.role())
            .orElseThrow(() ->
                    new IllegalStateException("Role not configured"));

    PendingRegistration pending = new PendingRegistration();
pending.setPhoneNumber(phone);
pending.setDisplayName(request.displayName());
pending.setRole(request.role());
pending.setCreatedAt(Instant.now());
pending.setExpiresAt(
        Instant.now().plus(otpTtlMinutes, ChronoUnit.MINUTES)
);

pendingRegistrationRepository.save(pending);

    // Generate OTP
    String otpValue =
            String.format("%06d", secureRandom.nextInt(1_000_000));

    Otp otp = new Otp();
    otp.setPhoneNumber(phone);
    otp.setOtpHash(passwordEncoder.encode(otpValue));
    otp.setExpiresAt(
            Instant.now().plus(otpTtlMinutes, ChronoUnit.MINUTES)
    );
    otp.setAttempts(0);
    otp.setConsumed(false);
    otp.setCreatedAt(Instant.now());

    otpRepository.save(otp);

    otpDeliveryService.deliver(phone, otpValue);

    return new OtpResponse(
            "Registration OTP sent",
            exposeOtp ? otpValue : null
    );
}

    @Transactional
    public AuthResponse verifyRegistration(RegisterVerifyRequest request) {

        String phone = PhoneNumberUtil.normalize(request.phoneNumber());

        // 1. Get pending registration
        PendingRegistration pendingRegistration =
                pendingRegistrationRepository.findByPhoneNumber(phone)
                        .orElseThrow(() ->
                                new UnauthorizedException(
                                        "Registration not found or expired"
                                ));

        // 2. Check registration expiry
        if (pendingRegistration.getExpiresAt().isBefore(Instant.now())) {
            pendingRegistrationRepository.delete(pendingRegistration);

            throw new UnauthorizedException(
                    "Registration expired"
            );
        }

        // 3. Get latest active OTP
        Otp otp = otpRepository
                .findTopByPhoneNumberAndConsumedFalseOrderByCreatedAtDesc(phone)
                .orElseThrow(() ->
                        new UnauthorizedException(
                                "OTP not found or expired"
                        ));

        // 4. Check OTP expiry
        if (otp.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("OTP expired");
        }

        // 5. Check maximum attempts
        if (otp.getAttempts() >= maxOtpAttempts) {
            throw new UnauthorizedException(
                    "Maximum OTP attempts exceeded"
            );
        }

        // 6. Verify OTP
        if (!passwordEncoder.matches(
                request.otp(),
                otp.getOtpHash()
        )) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);

            throw new UnauthorizedException("Invalid OTP");
        }

        // 7. OTP successfully verified
        otp.setConsumed(true);
        otpRepository.save(otp);

        // 8. Get role
        UserRole role = pendingRegistration.getRole();

        Role userRole = roleRepository.findByName(role)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Role not configured"
                        ));

        // 9. Create User ONLY AFTER OTP verification
        User user = new User();
        user.setPhoneNumber(
                pendingRegistration.getPhoneNumber()
        );
        user.setDisplayName(
                pendingRegistration.getDisplayName()
        );
        user.setEnabled(true);
        user.setRole(userRole);

        userRepository.save(user);

        // 10. Create role-specific record
        String healthId = null;

        switch (role) {

            case patient -> {
                Patient patient = new Patient();

                patient.setUser(user);

                healthId = generateHealthId();
                patient.setHealthId(healthId);

                patient.setQrCodePayloadHash(
                        HashUtil.sha256Hex(healthId)
                );

                patientRepository.save(patient);
            }

            case doctor -> {
                // Create Doctor after collecting
                // doctor-specific information.
            }

            case emergency_responder -> {
                // Create emergency responder record
                // if required.
            }

            case government_verifier -> {
                // Create government verifier record
                // if required.
            }

            case admin -> {
                throw new IllegalArgumentException(
                        "Admin registration is not allowed"
                );
            }
        }

        // 11. Delete OTP after successful registration
        otpRepository.delete(otp);

        // 12. Delete pending registration
        pendingRegistrationRepository.delete(
                pendingRegistration
        );

        // 13. Return registration response
        return new AuthResponse(
                null,
                user.getId(),
                role.toString(),
                healthId,
                user.getDisplayName(),
                null
        );
    }

    @Transactional
    public OtpResponse requestOtp(OtpRequest request) {
        String phone = PhoneNumberUtil.normalize(request.phoneNumber());
        User user = userRepository.findByPhoneNumber(phone)
                .filter(User::isEnabled)
                .orElseThrow(() -> new UnauthorizedException("No active account exists for this phone number"));

        otpRepository.findTopByPhoneNumberAndConsumedFalseOrderByCreatedAtDesc(phone).ifPresent(existing -> {
            existing.setConsumed(true);
            otpRepository.save(existing);
        });

        String otpValue = String.format("%06d", secureRandom.nextInt(1_000_000));
        Otp otp = new Otp();
        otp.setPhoneNumber(phone);
        otp.setOtpHash(passwordEncoder.encode(otpValue));
        otp.setExpiresAt(Instant.now().plus(otpTtlMinutes, ChronoUnit.MINUTES));
        otp.setAttempts(0);
        otp.setConsumed(false);
        otp.setCreatedAt(Instant.now());
        otpRepository.save(otp);
        otpDeliveryService.deliver(phone, otpValue);
        auditService.log(user, patientRepository.findByUserId(user.getId()).orElse(null), AuditAction.OTP_REQUESTED, "OTP requested");
        return new OtpResponse("OTP sent", exposeOtp ? otpValue : null);
    }

    @Transactional
    public AuthResponse verifyOtp(OtpVerifyRequest request) {
        String phone = PhoneNumberUtil.normalize(request.phoneNumber());
        User user = userRepository.findByPhoneNumber(phone)
                .filter(User::isEnabled)
                .orElseThrow(() -> new UnauthorizedException("Invalid OTP"));
        Otp otp = otpRepository.findTopByPhoneNumberAndConsumedFalseOrderByCreatedAtDesc(phone)
                .orElseThrow(() -> new UnauthorizedException("OTP not found or already used"));
        if (otp.getExpiresAt().isBefore(Instant.now())) {
            otp.setConsumed(true);
            otpRepository.save(otp);
            throw new UnauthorizedException("OTP has expired");
        }
        if (otp.getAttempts() >= maxOtpAttempts) {
            otp.setConsumed(true);
            otpRepository.save(otp);
            throw new UnauthorizedException("OTP attempt limit exceeded");
        }
        if (!passwordEncoder.matches(request.otp(), otp.getOtpHash())) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);
            auditService.log(user, patientRepository.findByUserId(user.getId()).orElse(null), AuditAction.LOGIN_FAILED, "Invalid OTP");
            throw new UnauthorizedException("Invalid OTP");
        }

        otp.setConsumed(true);
        otpRepository.save(otp);
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getRole().getName().name());
        String refreshTokenValue = UUID.randomUUID() + "." + UUID.randomUUID();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(HashUtil.sha256Hex(refreshTokenValue));
        refreshToken.setExpiresAt(Instant.now().plus(refreshTtlDays, ChronoUnit.DAYS));
        refreshTokenRepository.save(refreshToken);
        Patient patient = patientRepository.findByUserId(user.getId()).orElse(null);
        auditService.log(user, patient, AuditAction.OTP_VERIFIED, "OTP login successful");
        otpRepository.delete(otp); 
        return new AuthResponse(accessToken, user.getId(), user.getRole().getName().name(),
                patient != null ? patient.getHealthId() : null, user.getDisplayName(), refreshTokenValue);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String hash = HashUtil.sha256Hex(request.refreshToken());
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(Instant.now()) || !token.getUser().isEnabled()) {
            throw new UnauthorizedException("Refresh token is expired or revoked");
        }
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);
        String accessToken = jwtService.generateAccessToken(token.getUser().getId(), token.getUser().getRole().getName().name());
        String nextRefresh = UUID.randomUUID() + "." + UUID.randomUUID();
        RefreshToken next = new RefreshToken();
        next.setUser(token.getUser());
        next.setTokenHash(HashUtil.sha256Hex(nextRefresh));
        next.setExpiresAt(Instant.now().plus(refreshTtlDays, ChronoUnit.DAYS));
        refreshTokenRepository.save(next);
        Patient patient = patientRepository.findByUserId(token.getUser().getId()).orElse(null);
        return new AuthResponse(accessToken, token.getUser().getId(), token.getUser().getRole().getName().name(),
                patient != null ? patient.getHealthId() : null, token.getUser().getDisplayName(), nextRefresh);
    }

    @Transactional
    public void logout(LogoutRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isBlank()) return;
        refreshTokenRepository.findByTokenHash(HashUtil.sha256Hex(request.refreshToken())).ifPresent(token -> {
            token.setRevokedAt(Instant.now());
            refreshTokenRepository.save(token);
            auditService.log(token.getUser(), patientRepository.findByUserId(token.getUser().getId()).orElse(null), AuditAction.LOGOUT, "Refresh token revoked");
        });
    }

    private String generateHealthId() {

        String healthId;
        
        do {
            healthId = "PHR-IN-" + String.format("%06d", secureRandom.nextInt(1_000_000));
        } while (patientRepository.findByHealthId(healthId).isPresent());
    
        return healthId;
    }

}
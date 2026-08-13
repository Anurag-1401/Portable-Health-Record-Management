package com.portable_health_record_system.service.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ConsoleOtpDeliveryService implements OtpDeliveryService {
    private static final Logger log = LoggerFactory.getLogger(ConsoleOtpDeliveryService.class);
    private final boolean exposeOtp;

    public ConsoleOtpDeliveryService(@Value("${app.otp.expose-in-response}") boolean exposeOtp) {
        this.exposeOtp = exposeOtp;
    }

    @Override
    public void deliver(String phoneNumber, String otp) {
        if (exposeOtp) {
            log.info("Development OTP generated for {}: {}", phoneNumber, otp);
        } else {
            log.info("OTP delivery requested for {}", phoneNumber);
        }
    }
}

package com.portable_health_record_system.service.auth;

public interface OtpDeliveryService {
    void deliver(String phoneNumber, String otp);
}

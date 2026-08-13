package com.portable_health_record_system.util;

public final class PhoneNumberUtil {
    private PhoneNumberUtil() {}

    public static String normalize(String value) {
        return value.trim().replaceAll("[\\s()-]", "");
    }
}

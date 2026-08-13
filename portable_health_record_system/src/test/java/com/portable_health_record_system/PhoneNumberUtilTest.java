package com.portable_health_record_system;

import com.portable_health_record_system.util.PhoneNumberUtil;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PhoneNumberUtilTest {
    @Test
    void normalizesCommonPhoneFormatting() {
        assertEquals("+919999999001", PhoneNumberUtil.normalize("+91 99999-99001"));
    }
}

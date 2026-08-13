package com.portable_health_record_system.entity.patient;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.doctor.Doctor;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "patients", indexes = {
        @Index(name = "idx_patients_health_id", columnList = "health_id", unique = true),
        @Index(name = "idx_patients_user", columnList = "user_id", unique = true)
})
@Getter @Setter @NoArgsConstructor
public class Patient extends EntityBase {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "health_id", nullable = false, unique = true, length = 64)
    private String healthId;

    @Column(name = "blood_group", length = 16)
    private String bloodGroup;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allergies", columnDefinition = "jsonb", nullable = false)
    private List<Object> allergies = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "chronic_conditions", columnDefinition = "jsonb", nullable = false)
    private List<Object> chronicConditions = new ArrayList<>();

    @Column(name = "qr_code_payload_hash", nullable = false, length = 64)
    private String qrCodePayloadHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_doctor_id")
    private Doctor primaryDoctor;
}

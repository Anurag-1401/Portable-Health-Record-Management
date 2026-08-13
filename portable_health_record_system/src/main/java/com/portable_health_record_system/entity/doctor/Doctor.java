package com.portable_health_record_system.entity.doctor;

import com.portable_health_record_system.common.EntityBase;
import com.portable_health_record_system.entity.auth.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "doctors", indexes = {
        @Index(name = "idx_doctors_user", columnList = "user_id", unique = true),
        @Index(name = "idx_doctors_hospital", columnList = "hospital_id")
})
@Getter @Setter @NoArgsConstructor
public class Doctor extends EntityBase {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "license_number", nullable = false, unique = true, length = 100)
    private String licenseNumber;

    @Column(name = "specialization", length = 160)
    private String specialization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;
}

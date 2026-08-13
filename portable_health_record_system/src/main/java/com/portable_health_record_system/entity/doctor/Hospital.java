package com.portable_health_record_system.entity.doctor;

import com.portable_health_record_system.common.EntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "hospitals")
@Getter @Setter @NoArgsConstructor
public class Hospital extends EntityBase {
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "registration_number", unique = true, length = 100)
    private String registrationNumber;

    @Column(name = "address", length = 500)
    private String address;
}

package com.portable_health_record_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class PortableHealthRecordSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(PortableHealthRecordSystemApplication.class, args);
	}

	@GetMapping("/")
    public String home() {
        return "Portable Health Record System Backend is running !";
    }
}

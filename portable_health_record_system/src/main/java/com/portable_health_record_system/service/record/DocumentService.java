package com.portable_health_record_system.service.record;

import com.portable_health_record_system.common.AuditAction;
import com.portable_health_record_system.common.ConsentStatus;
import com.portable_health_record_system.dto.record.DocumentDto;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.entity.patient.Patient;
import com.portable_health_record_system.entity.record.Document;
import com.portable_health_record_system.entity.record.MedicalRecord;
import com.portable_health_record_system.exception.AccessDeniedBusinessException;
import com.portable_health_record_system.exception.ResourceNotFoundException;
import com.portable_health_record_system.repository.consent.ConsentRepository;
// import com.portable_health_record_system.repository.patient.PatientRepository;
import com.portable_health_record_system.repository.record.DocumentRepository;
import com.portable_health_record_system.repository.record.MedicalRecordRepository;
import com.portable_health_record_system.service.auth.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
//     private final PatientRepository patientRepository;
    private final ConsentRepository consentRepository;
    private final AuditService auditService;

    @Value("${app.storage.documents-path:uploads/documents}")
    private String storagePath;

    /* ========================================================
       UPLOAD
       ======================================================== */

    @Transactional
    public DocumentDto upload(
            MultipartFile file,
            UUID recordId,
            User actor
    ) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "A file is required"
            );
        }

        MedicalRecord record =
                medicalRecordRepository.findById(recordId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Medical record not found"
                                )
                        );

        Patient patient = record.getPatient();

        authorizeWrite(actor, patient);

        try {

            Path directory =
                    Paths.get(storagePath)
                            .toAbsolutePath()
                            .normalize();

            Files.createDirectories(directory);

            String storageKey =
                    UUID.randomUUID()
                            .toString();

            String originalName =
                    sanitizeFileName(file.getOriginalFilename());

            String extension =
                    getExtension(originalName);

            String storedName =
                    storageKey + extension;

            Path target =
                    directory.resolve(storedName)
                            .normalize();

            if (!target.startsWith(directory)) {
                throw new IllegalArgumentException(
                        "Invalid file path"
                );
            }

            String sha256 =
                    calculateSha256(file);

            try (InputStream inputStream =
                         file.getInputStream()) {

                Files.copy(
                        inputStream,
                        target,
                        StandardCopyOption.REPLACE_EXISTING
                );
            }

            Document document = new Document();

            document.setPatient(patient);
            document.setRecord(record);
            document.setFileName(originalName);

            String contentType =
                    file.getContentType();

            document.setContentType(
                    contentType == null ||
                    contentType.isBlank()
                            ? "application/octet-stream"
                            : contentType
            );

            document.setStorageKey(storedName);
            document.setSha256(sha256);
            document.setFileSize(file.getSize());

            Document saved =
                    documentRepository.save(document);

            auditService.log(
                    actor,
                    patient,
                    AuditAction.RECORD_UPDATED,
                    "Medical record attachment uploaded: "
                            + originalName
            );

            return toDto(saved);

        } catch (IOException e) {

            throw new IllegalStateException(
                    "Failed to store document",
                    e
            );
        }
    }

    /* ========================================================
       READ
       ======================================================== */

    @Transactional(readOnly = true)
    public List<DocumentDto> getRecordDocuments(
            UUID recordId,
            User actor
    ) {

        MedicalRecord record =
                medicalRecordRepository.findById(recordId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Medical record not found"
                                )
                        );

        authorizeRead(
                actor,
                record.getPatient()
        );

        return documentRepository
                .findByRecordIdOrderByIdDesc(recordId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    /* ========================================================
       DOWNLOAD
       ======================================================== */

    @Transactional(readOnly = true)
    public Path getFilePath(
            UUID documentId,
            User actor
    ) {

        Document document =
                documentRepository.findById(documentId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Document not found"
                                )
                        );

        authorizeRead(
                actor,
                document.getPatient()
        );

        Path directory =
                Paths.get(storagePath)
                        .toAbsolutePath()
                        .normalize();

        Path path =
                directory
                        .resolve(document.getStorageKey())
                        .normalize();

        if (!path.startsWith(directory)) {
            throw new AccessDeniedBusinessException(
                    "Invalid document path"
            );
        }

        if (!Files.exists(path)) {
            throw new ResourceNotFoundException(
                    "Document file not found"
            );
        }

        return path;
    }

    /* ========================================================
       DELETE
       ======================================================== */

    @Transactional
    public void delete(
            UUID documentId,
            User actor
    ) {

        Document document =
                documentRepository.findById(documentId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Document not found"
                                )
                        );

        authorizeWrite(
                actor,
                document.getPatient()
        );

        Path directory =
                Paths.get(storagePath)
                        .toAbsolutePath()
                        .normalize();

        Path file =
                directory
                        .resolve(document.getStorageKey())
                        .normalize();

        try {

            if (file.startsWith(directory)) {
                Files.deleteIfExists(file);
            }

            documentRepository.delete(document);

            auditService.log(
                    actor,
                    document.getPatient(),
                    AuditAction.RECORD_UPDATED,
                    "Medical record attachment deleted: "
                            + document.getFileName()
            );

        } catch (IOException e) {

            throw new IllegalStateException(
                    "Failed to delete document",
                    e
            );
        }
    }

    /* ========================================================
       AUTHORIZATION
       ======================================================== */

    private void authorizeRead(
            User user,
            Patient patient
    ) {

        switch (user.getRole().getName()) {

            case admin -> {
            }

            case patient -> {

                if (!patient.getUser()
                        .getId()
                        .equals(user.getId())) {

                    throw new AccessDeniedBusinessException(
                            "Patients may only access their own documents"
                    );
                }
            }

            case doctor -> {

                boolean approved =
                        consentRepository
                                .findByPatientIdAndStatus(
                                        patient.getId(),
                                        ConsentStatus.APPROVED
                                )
                                .stream()
                                .anyMatch(consent ->
                                        consent.getDoctor() != null
                                                && consent.getDoctor()
                                                .getUser()
                                                .getId()
                                                .equals(user.getId())
                                );

                if (!approved) {
                    throw new AccessDeniedBusinessException(
                            "Doctor access requires approved patient consent"
                    );
                }
            }

            default ->
                    throw new AccessDeniedBusinessException(
                            "This role cannot access documents"
                    );
        }
    }

    private void authorizeWrite(
            User user,
            Patient patient
    ) {

        switch (user.getRole().getName()) {

            case admin -> {
            }

            case patient -> {

                if (!patient.getUser()
                        .getId()
                        .equals(user.getId())) {

                    throw new AccessDeniedBusinessException(
                            "Patients may only modify their own documents"
                    );
                }
            }

            case doctor -> {

                boolean approved =
                        consentRepository
                                .findByPatientIdAndStatus(
                                        patient.getId(),
                                        ConsentStatus.APPROVED
                                )
                                .stream()
                                .anyMatch(consent ->
                                        consent.getDoctor() != null
                                                && consent.getDoctor()
                                                .getUser()
                                                .getId()
                                                .equals(user.getId())
                                );

                if (!approved) {
                    throw new AccessDeniedBusinessException(
                            "Doctor write access requires approved patient consent"
                    );
                }
            }

            default ->
                    throw new AccessDeniedBusinessException(
                            "This role cannot modify documents"
                    );
        }
    }

    /* ========================================================
       HELPERS
       ======================================================== */

    private String calculateSha256(
            MultipartFile file
    ) throws IOException {

        try {

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            try (InputStream inputStream =
                         file.getInputStream()) {

                byte[] buffer =
                        new byte[8192];

                int read;

                while ((read =
                        inputStream.read(buffer)) != -1) {

                    digest.update(
                            buffer,
                            0,
                            read
                    );
                }
            }

            return HexFormat.of()
                    .formatHex(digest.digest());

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Failed to calculate file hash",
                    e
            );
        }
    }

    private String sanitizeFileName(
            String fileName
    ) {

        if (fileName == null ||
                fileName.isBlank()) {

            return "attachment";
        }

        String name =
                Paths.get(fileName)
                        .getFileName()
                        .toString();

        return name.length() > 255
                ? name.substring(0, 255)
                : name;
    }

    private String getExtension(
            String fileName
    ) {

        int index =
                fileName.lastIndexOf('.');

        if (index <= 0 ||
                index == fileName.length() - 1) {

            return "";
        }

        return fileName.substring(index)
                .toLowerCase();
    }

    private DocumentDto toDto(
            Document document
    ) {

        return new DocumentDto(
                document.getId(),
                document.getPatient().getId(),
                document.getRecord() != null
                        ? document.getRecord().getId()
                        : null,
                document.getFileName(),
                document.getContentType(),
                document.getFileSize(),
                document.getSha256()
        );
    }
} 
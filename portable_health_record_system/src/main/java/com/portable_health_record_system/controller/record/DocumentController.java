package com.portable_health_record_system.controller.record;

import com.portable_health_record_system.dto.record.DocumentDto;
import com.portable_health_record_system.entity.auth.User;
import com.portable_health_record_system.security.CurrentUserService;
import com.portable_health_record_system.service.record.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final CurrentUserService currentUserService;

    /* ========================================================
       UPLOAD
       ======================================================== */

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public DocumentDto upload(
            @RequestParam("file")
            MultipartFile file,

            @RequestParam("recordId")
            UUID recordId
    ) {

        User actor =
                currentUserService.requireUser();

        return documentService.upload(
                file,
                recordId,
                actor
        );
    }

    /* ========================================================
       LIST RECORD ATTACHMENTS
       ======================================================== */

    @GetMapping("/record/{recordId}")
    public List<DocumentDto> getRecordDocuments(
            @PathVariable UUID recordId
    ) {

        User actor =
                currentUserService.requireUser();

        return documentService.getRecordDocuments(
                recordId,
                actor
        );
    }

    /* ========================================================
       DOWNLOAD
       ======================================================== */

    @GetMapping("/{documentId}/download")
    public ResponseEntity<InputStreamResource> download(
            @PathVariable UUID documentId
    ) throws IOException {

        User actor =
                currentUserService.requireUser();

        Path path =
                documentService.getFilePath(
                        documentId,
                        actor
                );

        String contentType =
                Files.probeContentType(path);

        if (contentType == null) {
            contentType =
                    MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        InputStreamResource resource =
                new InputStreamResource(
                        Files.newInputStream(path)
                );

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType(
                                contentType
                        )
                )
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" +
                                path.getFileName() +
                                "\""
                )
                .body(resource);
    }

    /* ========================================================
       DELETE
       ======================================================== */

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID documentId
    ) {

        User actor =
                currentUserService.requireUser();

        documentService.delete(
                documentId,
                actor
        );

        return ResponseEntity.noContent()
                .build();
    }
}
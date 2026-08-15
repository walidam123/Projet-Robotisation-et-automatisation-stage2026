package com.stage.tgr.scrapermarches.controller;

import com.stage.tgr.scrapermarches.model.FichierDce;
import com.stage.tgr.scrapermarches.repository.FichierDceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DocumentController {

    private final FichierDceRepository fichierDceRepository;

    @GetMapping("/view")
    public ResponseEntity<Resource> viewDocument(@RequestParam("reference") String reference, @RequestParam("nomFichier") String nomFichier) {
        try {
            List<FichierDce> fichiers = fichierDceRepository.findByAppelOffreId(reference);
            
            Optional<FichierDce> fichierOpt = fichiers.stream()
                    .filter(f -> f.getNomFichier().equals(nomFichier))
                    .findFirst();

            if (fichierOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            FichierDce fichier = fichierOpt.get();
            Resource resource = new ByteArrayResource(fichier.getDonnees());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(fichier.getContentType() != null ? fichier.getContentType() : "application/pdf"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fichier.getNomFichier() + "\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

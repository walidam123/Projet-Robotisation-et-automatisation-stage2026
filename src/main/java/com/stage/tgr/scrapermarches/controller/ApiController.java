package com.stage.tgr.scrapermarches.controller;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;
import com.stage.tgr.scrapermarches.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ApiController {

    private final AppelOffreRepository appelOffreRepository;
    private final ConfigurationRobotRepository configRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final com.stage.tgr.scrapermarches.service.ScrapingService scrapingService;
    private final com.stage.tgr.scrapermarches.service.AlerteCronService alerteCronService;

    /**
     * GET /api/marches — Retourne uniquement les marchés du membre connecté (filtrés par configId)
     */
    @GetMapping("/marches")
    public List<AppelOffre> getMarches(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return utilisateurRepository.findById(userId).map(user -> {
            if (user.getConfigId() != null) {
                return appelOffreRepository.findByConfigId(user.getConfigId());
            }
            return List.<AppelOffre>of();
        }).orElse(List.of());
    }

    /**
     * GET /api/config — Retourne la configuration du membre connecté
     */
    @GetMapping("/config")
    public ResponseEntity<?> getConfig(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return utilisateurRepository.findById(userId).map(user -> {
            if (user.getConfigId() == null) {
                return ResponseEntity.ok(ConfigurationRobot.builder()
                        .acheteurCible("")
                        .emailNotification(user.getEmail())
                        .limiteResultats(10)
                        .build());
            }
            return configRepository.findById(user.getConfigId())
                    .map(c -> ResponseEntity.ok(c))
                    .orElse(ResponseEntity.ok(ConfigurationRobot.builder().build()));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT /api/config — Met à jour la configuration du membre connecté
     */
    @PutMapping("/config")
    public ResponseEntity<?> saveConfig(@RequestBody ConfigurationRobot config, Authentication auth) {
        String userId = (String) auth.getPrincipal();
        return utilisateurRepository.findById(userId).map(user -> {
            if (user.getConfigId() != null) {
                config.setId(user.getConfigId());
                config.setProprietaireId(userId);
            }
            ConfigurationRobot saved = configRepository.save(config);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/membre/run-scraper — Lance l'extraction avec la config du membre connecté
     */
    @PostMapping("/membre/run-scraper")
    public ResponseEntity<Map<String, String>> runScraperMembre(
            @RequestParam(defaultValue = "ACHETEUR") String type,
            Authentication auth) {
        String userId = (String) auth.getPrincipal();
        utilisateurRepository.findById(userId).ifPresent(user -> {
            scrapingService.demarrerExtractionPourMembre(type, user.getConfigId());
        });
        return ResponseEntity.ok(Map.of("message", "Extraction (" + type + ") terminée avec succès."));
    }

    /**
     * POST /api/run-alerts — Envoie les alertes du membre connecté
     */
    @PostMapping("/run-alerts")
    public ResponseEntity<Map<String, String>> runAlerts(Authentication auth) {
        new Thread(() -> alerteCronService.verifierEtEnvoyerAlertes()).start();
        return ResponseEntity.ok(Map.of("message", "Vérification des alertes démarrée."));
    }
}

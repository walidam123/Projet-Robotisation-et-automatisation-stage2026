package com.stage.tgr.scrapermarches.controller;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Autoriser le frontend React (par ex: localhost:5173) à interroger le backend
@RequiredArgsConstructor
public class ApiController {

    private final AppelOffreRepository appelOffreRepository;
    private final ConfigurationRobotRepository configRepository;
    private final com.stage.tgr.scrapermarches.service.ScrapingService scrapingService;
    private final com.stage.tgr.scrapermarches.service.AlerteCronService alerteCronService;

    @GetMapping("/marches")
    public List<AppelOffre> getMarches() {
        return appelOffreRepository.findAll();
    }

    @GetMapping("/config")
    public ConfigurationRobot getConfig() {
        return configRepository.findById("1").orElse(
                ConfigurationRobot.builder()
                        .id("1")
                        .acheteurCible("POSTE MAROC")
                        .emailNotification("")
                        .dateDebutRecherche(LocalDate.now())
                        .dateFinRecherche(LocalDate.now().plusMonths(6))
                        .limiteResultats(50)
                        .build()
        );
    }

    @PostMapping("/config")
    public ConfigurationRobot saveConfig(@RequestBody ConfigurationRobot config) {
        config.setId("1");
        return configRepository.save(config);
    }

    @PostMapping("/run-scraper")
    public ResponseEntity<Map<String, String>> runScraper() {
        // Lancement synchrone (le navigateur va attendre la fin de l'extraction)
        scrapingService.demarrerExtraction();
        return ResponseEntity.ok(Map.of("message", "Extraction terminée avec succès."));
    }

    @PostMapping("/run-alerts")
    public ResponseEntity<Map<String, String>> runAlerts() {
        new Thread(() -> alerteCronService.verifierEtEnvoyerAlertes()).start();
        return ResponseEntity.ok(Map.of("message", "Vérification des alertes démarrée en arrière-plan."));
    }
}

package com.stage.tgr.scrapermarches.controller;

import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.time.LocalDate;

@Controller
@RequiredArgsConstructor
public class WebController {

    private final AppelOffreRepository appelOffreRepository;
    private final ConfigurationRobotRepository configRepository;
    private final com.stage.tgr.scrapermarches.service.ScrapingService scrapingService;
    private final com.stage.tgr.scrapermarches.service.AlerteCronService alerteCronService;

    @GetMapping("/")
    public String dashboard(Model model) {
        // Envoie tous les marchés publics à la vue Thymeleaf
        model.addAttribute("marches", appelOffreRepository.findAll());
        return "dashboard";
    }

    @GetMapping("/config")
    public String afficherConfig(Model model) {
        // Charge la configuration existante ou crée une par défaut
        ConfigurationRobot config = configRepository.findById("1").orElse(
                ConfigurationRobot.builder()
                        .id("1")
                        .acheteurCible("POSTE MAROC")
                        .emailNotification("")
                        .dateDebutRecherche(LocalDate.now())
                        .dateFinRecherche(LocalDate.now().plusMonths(6))
                        .limiteResultats(50)
                        .build()
        );
        model.addAttribute("config", config);
        return "config";
    }

    @PostMapping("/config")
    public String sauvegarderConfig(@ModelAttribute ConfigurationRobot config) {
        config.setId("1"); // Toujours forcer l'ID 1 pour avoir une configuration unique
        configRepository.save(config);
        return "redirect:/?success=true"; // Redirige vers le dashboard avec un message de succès
    }

    @PostMapping("/demarrer-scraping")
    public String demarrerScraping() {
        // Lancement asynchrone par défaut sur ACHETEUR
        new Thread(() -> scrapingService.demarrerExtraction("ACHETEUR")).start();
        return "redirect:/?success=Extraction démarrée en arrière-plan";
    }

    @GetMapping("/run-alerts")
    public String runAlerts() {
        new Thread(() -> alerteCronService.verifierEtEnvoyerAlertes()).start();
        return "redirect:/?alerts=started";
    }
}

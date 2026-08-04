package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClotureMarchesService {

    private final AppelOffreRepository repository;

    // S'exécute tous les jours à 1h du matin
    @Scheduled(cron = "0 0 1 * * ?")
    public void verifierEtCloturerMarches() {
        log.info("Lancement de la tâche planifiée : Vérification des marchés expirés...");
        
        List<AppelOffre> marchesACloturer = repository.findByStatutAndDateLimiteRemiseBefore("Ouvert", LocalDateTime.now());
        
        if (marchesACloturer.isEmpty()) {
            log.info("Aucun marché à clôturer aujourd'hui.");
            return;
        }

        for (AppelOffre marche : marchesACloturer) {
            marche.setStatut("Clôturé");
        }

        repository.saveAll(marchesACloturer);
        log.info("{} marchés ont été clôturés avec succès.", marchesACloturer.size());
    }
}

package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.FichierDceRepository;
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
    private final FichierDceRepository fichierDceRepository;

    // S'exécute tous les jours à 1h du matin
    @Scheduled(cron = "0 0 1 * * ?")
    public void verifierEtCloturerMarches() {
        log.info("Lancement de la tâche planifiée : Vérification et nettoyage des marchés expirés...");
        
        // 1. Clôture des marchés expirés (date limite dépassée)
        List<AppelOffre> marchesACloturer = repository.findByStatutAndDateLimiteRemiseBefore("Ouvert", LocalDateTime.now());
        
        if (!marchesACloturer.isEmpty()) {
            for (AppelOffre marche : marchesACloturer) {
                marche.setStatut("Clôturé");
            }
            repository.saveAll(marchesACloturer);
            log.info("{} marchés ont été clôturés avec succès.", marchesACloturer.size());
        } else {
            log.info("Aucun marché à clôturer aujourd'hui.");
        }

        // 2. Suppression des marchés clôturés il y a plus d'un jour
        LocalDateTime ilYaUnJour = LocalDateTime.now().minusDays(1);
        List<AppelOffre> marchesASupprimer = repository.findByStatutAndDateLimiteRemiseBefore("Clôturé", ilYaUnJour);

        if (!marchesASupprimer.isEmpty()) {
            for (AppelOffre marche : marchesASupprimer) {
                // Supprimer les fichiers DCE stockés pour éviter les orphelins
                fichierDceRepository.findByAppelOffreId(marche.getReference())
                        .forEach(fichierDceRepository::delete);
                
                // Supprimer le marché
                repository.delete(marche);
            }
            log.info("{} marchés clôturés depuis plus d'un jour ont été définitivement supprimés.", marchesASupprimer.size());
        } else {
            log.info("Aucun marché à supprimer (clôturé depuis > 1 jour) aujourd'hui.");
        }
    }
}

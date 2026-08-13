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
@Slf4j
@RequiredArgsConstructor
public class StatutService {

    private final AppelOffreRepository repository;

    /**
     * Tâche planifiée pour s'exécuter tous les jours à minuit.
     * RG-02 : Clôture automatique des marchés dont la date limite est dépassée.
     */
    // @Scheduled(cron = "0 0 0 * * ?") // Désactivé pour la démo
    public void mettreAJourStatutsClotures() {
        log.info("Démarrage de la vérification des statuts des appels d'offres...");
        LocalDateTime maintenant = LocalDateTime.now();

        // On cherche tous les marchés "Ouverts" dont la date limite est antérieure à maintenant
        List<AppelOffre> marchesAEchoir = repository.findByStatutAndDateLimiteRemiseBefore("Ouvert", maintenant);

        if (marchesAEchoir.isEmpty()) {
            log.info("Aucun marché à clôturer pour le moment.");
            return;
        }

        log.info("{} marché(s) détecté(s) avec une date limite dépassée. Clôture en cours...", marchesAEchoir.size());

        for (AppelOffre ao : marchesAEchoir) {
            ao.setStatut("Clôturé");
            repository.save(ao);
            log.info("Le marché [{}] est maintenant Clôturé.", ao.getId());
        }

        log.info("Mise à jour des statuts terminée avec succès.");
    }
}

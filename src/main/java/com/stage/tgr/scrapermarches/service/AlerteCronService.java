package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AlerteCronService {

    private final AppelOffreRepository appelOffreRepository;
    private final ConfigurationRobotRepository configRepository;
    private final NotificationService notificationService;

    /**
     * S'exécute tous les jours à 10h00 du matin pour envoyer les emails d'alerte (J-7 et J-1).
     */
    @Scheduled(cron = "0 0 10 * * ?") // Activé : s'exécute à 10h du matin
    public void verifierEtEnvoyerAlertes() {
        log.info("Démarrage de la vérification quotidienne des alertes (J-7 / J-1)...");
        
        // 1. Récupérer l'email cible
        ConfigurationRobot config = configRepository.findById("1").orElse(null);
        if (config == null || config.getEmailNotification() == null || config.getEmailNotification().isEmpty()) {
            log.warn("Aucune configuration email trouvée. Impossible d'envoyer les alertes. Modifiez la configuration depuis l'interface.");
            return;
        }
        String emailCible = config.getEmailNotification();

        // 2. Parcourir uniquement les marchés ouverts
        LocalDateTime aujourdhui = LocalDateTime.now();
        List<AppelOffre> marchesOuverts = appelOffreRepository.findByStatut("Ouvert");

        int alertesEnvoyees = 0;

        for (AppelOffre ao : marchesOuverts) {
            if (ao.getDateLimiteRemise() == null) continue;

            // Calcul du nombre de jours restants (sans prendre en compte l'heure exacte, juste la date)
            long joursRestants = ChronoUnit.DAYS.between(aujourdhui.toLocalDate(), ao.getDateLimiteRemise().toLocalDate());
            
            log.info("Marché {} - Date limite: {} - Jours restants calculés: {}", ao.getReference(), ao.getDateLimiteRemise().toLocalDate(), joursRestants);

            if (joursRestants == 7) {
                boolean success = notificationService.envoyerAlerte(emailCible, ao, 7);
                if (success) alertesEnvoyees++;
                try { Thread.sleep(4000); } catch(InterruptedException e) {} // Pause anti-spam (Mailtrap bloque à >2 mails/seconde)
            } else if (joursRestants == 1) {
                boolean success = notificationService.envoyerAlerte(emailCible, ao, 1);
                if (success) alertesEnvoyees++;
                try { Thread.sleep(4000); } catch(InterruptedException e) {} // Pause anti-spam
            }
        }
        
        log.info("Vérification terminée. {} email(s) envoyé(s).", alertesEnvoyees);
    }
}

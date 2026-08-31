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
    private final TelegramService telegramService;

    /**
     * S'exécute tous les jours à 10h00 du matin pour envoyer les emails d'alerte (J-7 et J-1).
     */
    @Scheduled(cron = "0 0 10 * * ?") // Activé : s'exécute à 10h du matin
    public void verifierEtEnvoyerAlertes() {
        log.info("Démarrage de la vérification quotidienne des alertes (J-7 / J-1)...");

        // Parcourir uniquement les marchés ouverts
        LocalDateTime aujourdhui = LocalDateTime.now();
        List<AppelOffre> marchesOuverts = appelOffreRepository.findByStatut("Ouvert");

        int alertesEnvoyees = 0;

        for (AppelOffre ao : marchesOuverts) {
            if (ao.getDateLimiteRemise() == null) continue;
            
            // 1. Récupérer la configuration associée à ce marché spécifique
            String configId = ao.getConfigId();
            if (configId == null) continue; // Si le marché n'est lié à aucune configuration (anormal)
            
            ConfigurationRobot config = configRepository.findById(configId).orElse(null);
            if (config == null) continue;
            
            String emailCible = config.getEmailNotification();
            String chatId = config.getTelegramChatId();

            // Calcul du nombre de jours restants (sans prendre en compte l'heure exacte, juste la date)
            long joursRestants = ChronoUnit.DAYS.between(aujourdhui.toLocalDate(), ao.getDateLimiteRemise().toLocalDate());
            
            if (joursRestants == 7 || joursRestants == 1) {
                log.info("Marché {} (Config {}) - Jours restants calculés: {}", ao.getReference(), configId, joursRestants);
                
                // Envoi Email si configuré
                if (emailCible != null && !emailCible.isEmpty()) {
                    boolean success = notificationService.envoyerAlerte(emailCible, ao, (int) joursRestants);
                    if (success) alertesEnvoyees++;
                    try { Thread.sleep(4000); } catch(InterruptedException e) {} // Pause anti-spam email
                }
                
                // Envoi Telegram si configuré
                if (chatId != null && !chatId.isEmpty()) {
                    telegramService.envoyerAlerte(ao, (int) joursRestants, chatId);
                }
            }
        }
        
        log.info("Vérification terminée. {} email(s) envoyé(s).", alertesEnvoyees);
    }
}

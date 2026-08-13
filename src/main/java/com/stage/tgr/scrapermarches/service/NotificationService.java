package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final JavaMailSender mailSender;

    public boolean envoyerAlerte(String destinataire, AppelOffre ao, int joursRestants) {
        if (destinataire == null || destinataire.isEmpty()) {
            log.warn("Aucun email configuré pour envoyer l'alerte.");
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(destinataire);
            
            if (joursRestants == 7) {
                message.setSubject("Rappel J-7 : Appel d'offres " + ao.getReference());
                message.setText("Bonjour,\n\nCeci est un rappel automatique.\n" +
                        "Il reste exactement 7 jours avant la date limite de remise des plis pour le marché :\n\n" +
                        "Référence : " + ao.getReference() + "\n" +
                        "Acheteur : " + ao.getAcheteurPublic() + "\n" +
                        "Objet : " + ao.getObjet() + "\n" +
                        "Date Limite : " + ao.getDateLimiteRemise() + "\n\n" +
                        "Lien d'accès : " + ao.getUrlDce());
            } else if (joursRestants == 1) {
                message.setSubject("⚠️ URGENT J-1 : Appel d'offres " + ao.getReference());
                message.setText("Bonjour,\n\nATTENTION : Il ne reste plus qu'un seul jour pour soumettre votre pli pour le marché :\n\n" +
                        "Référence : " + ao.getReference() + "\n" +
                        "Acheteur : " + ao.getAcheteurPublic() + "\n" +
                        "Objet : " + ao.getObjet() + "\n" +
                        "Date Limite : " + ao.getDateLimiteRemise() + "\n\n" +
                        "Lien d'accès : " + ao.getUrlDce());
            }

            mailSender.send(message);
            log.info("Email d'alerte (J-{}) envoyé avec succès à {}", joursRestants, destinataire);
            return true;
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email à {}. Raison : {}", destinataire, e.getMessage());
            log.error("Vérifiez vos identifiants SMTP (spring.mail.username et password) dans application.properties.");
            return false;
        }
    }
}

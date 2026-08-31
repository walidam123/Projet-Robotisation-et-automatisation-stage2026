package com.stage.tgr.scrapermarches.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.format.DateTimeFormatter;

import com.stage.tgr.scrapermarches.model.AppelOffre;

@Service
@Slf4j
public class TelegramService {

    @Value("${telegram.bot.token}")
    private String botToken;

    private final RestTemplate restTemplate = new RestTemplate();

    public void envoyerAlerte(AppelOffre marche, int joursRestants, String chatId) {
        if (chatId == null || chatId.isEmpty()) return; // Si le membre n'a pas configuré son Chat ID

        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        String dateFormatted = "Non précisée";
        if (marche.getDateLimiteRemise() != null) {
            dateFormatted = marche.getDateLimiteRemise().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        }

        String texteMessage = "🚨 *ALERTE MARCHE PUBLIC (" + (joursRestants == 1 ? "URGENT J-1" : "J-7") + ")* 🚨\n\n"
                + "L'appel d'offres : *" + marche.getReference() + "* arrive à échéance très bientôt !\n"
                + "�v� *Date limite :* " + dateFormatted + "\n\n"
                + "Veuillez vérifier le tableau de bord Veille Marchés.";

        String texteJson = texteMessage.replace("\n", "\\n").replace("\"", "\\\"");
        
        String payload = "{"
                + "\"chat_id\": \"" + chatId + "\","
                + "\"text\": \"" + texteJson + "\","
                + "\"parse_mode\": \"Markdown\""
                + "}";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> request = new HttpEntity<>(payload, headers);

        try {
            restTemplate.postForObject(url, request, String.class);
            log.info("[TELEGRAM] Alerte envoyée avec succès pour le marché : {}", marche.getReference());
        } catch (Exception e) {
            log.error("[TELEGRAM] Erreur lors de l'envoi de l'alerte : {}", e.getMessage());
        }
    }
}

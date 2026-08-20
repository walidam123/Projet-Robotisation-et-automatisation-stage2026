package com.stage.tgr.scrapermarches.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "configuration_robot")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigurationRobot {
    @Id
    private String id; // Il n'y aura qu'un seul document en base avec l'ID "1"
    
    private String acheteurCible;
    private String emailNotification;
    
    // Intervalle de date pour la recherche (Date limite de remise)
    private java.time.LocalDate dateDebutRecherche;
    private java.time.LocalDate dateFinRecherche;
    
    // On garde aussi la limite pour la pagination
    private int limiteResultats;
    
    // Ajouté pour la recherche par mot-clé (Lot 5)
    private String motCleRecherche;

    // Ajouté pour l'authentification (Lot 6) - lien avec le membre propriétaire
    private String proprietaireId;
}

package com.stage.tgr.scrapermarches.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Document(collection = "utilisateurs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Utilisateur {

    @Id
    private String id;

    private String nom;
    private String prenom;

    @Indexed(unique = true)
    private String email;

    @Indexed(unique = true)
    private String nomUtilisateur;

    private String motDePasse; // BCrypt hashé

    @Builder.Default
    private Set<String> roles = new HashSet<>(); // "ADMIN", "MEMBRE" (peut avoir les deux)

    @Builder.Default
    private boolean actif = false; // inactif jusqu'à validation par l'admin

    // Champs spécifiques aux MEMBRES
    private String poste;
    private String configId; // référence vers ConfigurationRobot

    private LocalDateTime dateCreation;
}

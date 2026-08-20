package com.stage.tgr.scrapermarches.model;



import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "appels_offres") // Le nom de la collection dans Atlas
@Data // Lombok: génère Getters, Setters, toString, etc.
@Builder // Permet de construire l'objet facilement plus tard
@NoArgsConstructor
@AllArgsConstructor
public class AppelOffre {

    @Id
    private String id; // Clé primaire composée : Référence + Acheteur (RG-01)

    @Field("reference")
    private String reference;

    @Field("statut")
    private String statut; // "Ouvert", "Clôturé"

    @Field("objet_prestation")
    private String objet;

    @Field("acheteur_public")
    private String acheteurPublic;

    @Field("date_publication")
    private LocalDateTime datePublication;

    @Field("date_limite_remise")
    private LocalDateTime dateLimiteRemise;

    @Field("lieu_execution")
    private String lieuExecution;

    @Field("url_dce")
    private String urlDce;
    
    // Champs ajoutés pour le Lot 3 (Téléchargement des dossiers)
    private boolean dceTelecharge;
    private List<String> nomsFichiers;
    
    // Ajouté pour le Lot 4 (NLP Estimation)
    private String estimationCout;

    // Ajouté pour l'authentification (Lot 6) - rattaché à la config du membre qui a lancé l'extraction
    private String configId;
}
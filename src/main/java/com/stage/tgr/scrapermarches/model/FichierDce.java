package com.stage.tgr.scrapermarches.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "fichiers_dce")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FichierDce {
    @Id
    private String id;
    private String appelOffreId; // Référence du marché
    private String nomFichier;
    private byte[] donnees;
    private String contentType;
}

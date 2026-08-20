package com.stage.tgr.scrapermarches.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AppelOffreDTO {
    private String reference;
    private String objet;
    private String acheteurPublic;
    private String dateLimiteBrute; // Ex: "15/07/2026 à 10:00"
    private String lieuExecution;
    private String urlDce;
    
    private boolean dceTelecharge;
    private List<String> nomsFichiers;
    private String estimationCout;
}

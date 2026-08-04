package com.stage.tgr.scrapermarches.mapper;



import com.stage.tgr.scrapermarches.dto.AppelOffreDTO;
import com.stage.tgr.scrapermarches.model.AppelOffre;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring")
public interface AppelOffreMapper {

    // On utilise une méthode personnalisée pour parser la date car le texte web est souvent "sale"
    @Mapping(target = "dateLimiteRemise", expression = "java(nettoyerEtParserDate(dto.getDateLimiteBrute()))")
    @Mapping(target = "id", expression = "java(dto.getReference() + \"-\" + dto.getAcheteurPublic())")
    @Mapping(target = "statut", constant = "Ouvert")
    AppelOffre toEntity(AppelOffreDTO dto);

    default LocalDateTime nettoyerEtParserDate(String dateWeb) {
        if (dateWeb == null || dateWeb.trim().isEmpty()) return null;
        try {
            // Nettoyage: on retire le mot "à" et les espaces multiples (ex: "15/07/2026 à 10:00" -> "15/07/2026 10:00")
            String cleanDate = dateWeb.replace("à", "").replaceAll("\\s+", " ").trim();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            return LocalDateTime.parse(cleanDate, formatter);
        } catch (Exception e) {
            return null; // En cas d'erreur de format du site, on ne fait pas planter le robot
        }
    }
}
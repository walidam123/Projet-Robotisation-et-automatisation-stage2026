package com.stage.tgr.scrapermarches.repository;



import com.stage.tgr.scrapermarches.model.AppelOffre;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppelOffreRepository extends MongoRepository<AppelOffre, String> {

    // Spring génère automatiquement la requête MongoDB derrière cette méthode !
    // Utile si on veut afficher sur un front-end les marchés d'un acheteur spécifique
    List<AppelOffre> findByAcheteurPublic(String acheteurPublic);

    // Utile pour trouver les appels d'offres dont la date limite n'est pas encore dépassée
    List<AppelOffre> findByDateLimiteRemiseAfter(LocalDateTime date);

    // Utile pour trouver les appels d'offres à clôturer
    List<AppelOffre> findByStatutAndDateLimiteRemiseBefore(String statut, LocalDateTime date);

    // Utile pour trouver tous les marchés avec un statut spécifique
    List<AppelOffre> findByStatut(String statut);
}
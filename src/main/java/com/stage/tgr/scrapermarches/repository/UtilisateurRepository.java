package com.stage.tgr.scrapermarches.repository;

import com.stage.tgr.scrapermarches.model.Utilisateur;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface UtilisateurRepository extends MongoRepository<Utilisateur, String> {

    Optional<Utilisateur> findByEmail(String email);

    Optional<Utilisateur> findByNomUtilisateur(String nomUtilisateur);

    Optional<Utilisateur> findByEmailOrNomUtilisateur(String email, String nomUtilisateur);

    boolean existsByEmail(String email);

    boolean existsByNomUtilisateur(String nomUtilisateur);

    // Recherche admin avec pagination (par nom, prénom ou nomUtilisateur)
    @Query("{ $or: [ { 'nom': { $regex: ?0, $options: 'i' } }, { 'prenom': { $regex: ?0, $options: 'i' } }, { 'nomUtilisateur': { $regex: ?0, $options: 'i' } } ] }")
    Page<Utilisateur> findBySearchTerm(String searchTerm, Pageable pageable);
}

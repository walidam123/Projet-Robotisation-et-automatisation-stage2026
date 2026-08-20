package com.stage.tgr.scrapermarches.controller;

import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.model.Utilisateur;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;
import com.stage.tgr.scrapermarches.repository.UtilisateurRepository;
import com.stage.tgr.scrapermarches.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UtilisateurRepository utilisateurRepository;
    private final ConfigurationRobotRepository configurationRobotRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * POST /api/auth/register — Inscription d'un nouveau membre
     * Le compte est créé inactif (actif = false)
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody Map<String, String> body) {
        String nom = body.get("nom");
        String prenom = body.get("prenom");
        String email = body.get("email");
        String nomUtilisateur = body.get("nomUtilisateur");
        String motDePasse = body.get("motDePasse");
        String poste = body.getOrDefault("poste", "");

        // Vérifications unicité
        if (utilisateurRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Cette adresse email est déjà utilisée."));
        }
        if (utilisateurRepository.existsByNomUtilisateur(nomUtilisateur)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Ce nom d'utilisateur est déjà pris."));
        }

        // Créer une configuration vide pour ce membre
        ConfigurationRobot config = ConfigurationRobot.builder()
                .acheteurCible("")
                .emailNotification(email)
                .limiteResultats(10)
                .build();
        ConfigurationRobot savedConfig = configurationRobotRepository.save(config);

        // Mettre à jour le propriétaire de la config après avoir obtenu son ID
        Set<String> roles = new HashSet<>();
        roles.add("MEMBRE");

        Utilisateur utilisateur = Utilisateur.builder()
                .nom(nom)
                .prenom(prenom)
                .email(email)
                .nomUtilisateur(nomUtilisateur)
                .motDePasse(passwordEncoder.encode(motDePasse))
                .roles(roles)
                .actif(false) // inactif jusqu'à validation admin
                .poste(poste)
                .configId(savedConfig.getId())
                .dateCreation(LocalDateTime.now())
                .build();

        Utilisateur savedUser = utilisateurRepository.save(utilisateur);

        // Lier la config au propriétaire
        savedConfig.setProprietaireId(savedUser.getId());
        configurationRobotRepository.save(savedConfig);

        log.info("[AUTH] Nouveau compte créé pour {} {} (inactif)", prenom, nom);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Compte créé avec succès. Un administrateur doit l'activer avant que vous puissiez vous connecter."));
    }

    /**
     * POST /api/auth/login — Connexion par email OU nomUtilisateur
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String identifiant = body.get("identifiant"); // email OU nomUtilisateur
        String motDePasse = body.get("motDePasse");

        // Chercher par email OU nomUtilisateur
        Utilisateur utilisateur = utilisateurRepository
                .findByEmailOrNomUtilisateur(identifiant, identifiant)
                .orElse(null);

        if (utilisateur == null || !passwordEncoder.matches(motDePasse, utilisateur.getMotDePasse())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Identifiant ou mot de passe incorrect."));
        }

        if (!utilisateur.isActif()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Votre compte est inactif. Veuillez contacter l'administrateur."));
        }

        // Générer le JWT (sans données sensibles)
        String token = jwtUtil.generateToken(
                utilisateur.getId(),
                utilisateur.getNomUtilisateur(),
                utilisateur.getRoles()
        );

        log.info("[AUTH] Connexion réussie pour {} (rôles: {})", utilisateur.getNomUtilisateur(), utilisateur.getRoles());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "nomUtilisateur", utilisateur.getNomUtilisateur(),
                "prenom", utilisateur.getPrenom(),
                "nom", utilisateur.getNom(),
                "roles", utilisateur.getRoles(),
                "configId", utilisateur.getConfigId() != null ? utilisateur.getConfigId() : ""
        ));
    }
}

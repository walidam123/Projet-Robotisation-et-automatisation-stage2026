package com.stage.tgr.scrapermarches.config;

import com.stage.tgr.scrapermarches.model.Utilisateur;
import com.stage.tgr.scrapermarches.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Crée un administrateur par défaut au premier démarrage si aucun n'existe.
 * Identifiants par défaut : admin / admin123
 * ⚠️ Changer le mot de passe après le premier login !
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        boolean adminExiste = utilisateurRepository.findAll().stream()
                .anyMatch(u -> u.getRoles().contains("ADMIN"));

        if (!adminExiste) {
            Utilisateur admin = Utilisateur.builder()
                    .nom("Administrateur")
                    .prenom("Super")
                    .email("admin@robot.ma")
                    .nomUtilisateur("admin")
                    .motDePasse(passwordEncoder.encode("admin123"))
                    .roles(Set.of("ADMIN"))
                    .actif(true)
                    .dateCreation(LocalDateTime.now())
                    .build();

            utilisateurRepository.save(admin);
            log.info("========================================================");
            log.info("  Compte admin créé automatiquement");
            log.info("  Identifiant : admin");
            log.info("  Mot de passe : admin123");
            log.info("  ⚠️  Changez ce mot de passe après le premier login !");
            log.info("========================================================");
        }
    }
}

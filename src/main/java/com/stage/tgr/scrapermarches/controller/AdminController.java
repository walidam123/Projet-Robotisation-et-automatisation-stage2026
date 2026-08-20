package com.stage.tgr.scrapermarches.controller;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.model.FichierDce;
import com.stage.tgr.scrapermarches.model.Utilisateur;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;
import com.stage.tgr.scrapermarches.repository.FichierDceRepository;
import com.stage.tgr.scrapermarches.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UtilisateurRepository utilisateurRepository;
    private final ConfigurationRobotRepository configurationRobotRepository;
    private final AppelOffreRepository appelOffreRepository;
    private final FichierDceRepository fichierDceRepository;
    private final PasswordEncoder passwordEncoder;

    /** GET /api/admin/users?search=&page=0&size=10 */
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listerUtilisateurs(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("dateCreation").descending());
        Page<Utilisateur> resultPage;

        if (search.isBlank()) {
            resultPage = utilisateurRepository.findAll(pageable);
        } else {
            resultPage = utilisateurRepository.findBySearchTerm(search, pageable);
        }

        // Masquer les mots de passe dans la réponse
        List<Map<String, Object>> utilisateursSanitized = resultPage.getContent().stream()
                .map(this::sanitizeUser)
                .toList();

        return ResponseEntity.ok(Map.of(
                "utilisateurs", utilisateursSanitized,
                "totalElements", resultPage.getTotalElements(),
                "totalPages", resultPage.getTotalPages(),
                "currentPage", page
        ));
    }

    /** GET /api/admin/users/{id} */
    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUtilisateur(@PathVariable String id) {
        return utilisateurRepository.findById(id)
                .map(u -> ResponseEntity.ok(sanitizeUser(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/admin/users — Créer un utilisateur (directement actif) */
    @PostMapping("/users")
    public ResponseEntity<?> creerUtilisateur(@RequestBody Map<String, Object> body) {
        String email = (String) body.get("email");
        String nomUtilisateur = (String) body.get("nomUtilisateur");

        if (utilisateurRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email déjà utilisé."));
        }
        if (utilisateurRepository.existsByNomUtilisateur(nomUtilisateur)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Nom d'utilisateur déjà pris."));
        }

        @SuppressWarnings("unchecked")
        Set<String> roles = new HashSet<>((List<String>) body.getOrDefault("roles", List.of("MEMBRE")));
        boolean estMembre = roles.contains("MEMBRE");

        ConfigurationRobot config = null;
        if (estMembre) {
            config = configurationRobotRepository.save(
                ConfigurationRobot.builder()
                    .acheteurCible("")
                    .emailNotification(email)
                    .limiteResultats(10)
                    .build()
            );
        }

        Utilisateur utilisateur = Utilisateur.builder()
                .nom((String) body.get("nom"))
                .prenom((String) body.get("prenom"))
                .email(email)
                .nomUtilisateur(nomUtilisateur)
                .motDePasse(passwordEncoder.encode((String) body.get("motDePasse")))
                .roles(roles)
                .actif(true) // l'admin crée le compte directement actif
                .poste((String) body.getOrDefault("poste", ""))
                .configId(config != null ? config.getId() : null)
                .dateCreation(LocalDateTime.now())
                .build();

        Utilisateur saved = utilisateurRepository.save(utilisateur);
        if (config != null) {
            config.setProprietaireId(saved.getId());
            configurationRobotRepository.save(config);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(sanitizeUser(saved));
    }

    /** PUT /api/admin/users/{id} — Modifier un utilisateur */
    @PutMapping("/users/{id}")
    public ResponseEntity<?> modifierUtilisateur(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return utilisateurRepository.findById(id).map(user -> {
            if (body.containsKey("nom")) user.setNom((String) body.get("nom"));
            if (body.containsKey("prenom")) user.setPrenom((String) body.get("prenom"));
            if (body.containsKey("email")) user.setEmail((String) body.get("email"));
            if (body.containsKey("poste")) user.setPoste((String) body.get("poste"));
            if (body.containsKey("motDePasse") && !((String) body.get("motDePasse")).isBlank()) {
                user.setMotDePasse(passwordEncoder.encode((String) body.get("motDePasse")));
            }
            if (body.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                Set<String> newRoles = new HashSet<>((List<String>) body.get("roles"));
                user.setRoles(newRoles);
            }
            utilisateurRepository.save(user);
            return ResponseEntity.ok(sanitizeUser(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/admin/users/{id} — Supprimer utilisateur + sa config + ses marchés */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> supprimerUtilisateur(@PathVariable String id) {
        return utilisateurRepository.findById(id).map(user -> {
            // Supprimer la configuration du robot
            if (user.getConfigId() != null) {
                // Supprimer les appels d'offres liés à sa config
                List<AppelOffre> marches = appelOffreRepository.findByConfigId(user.getConfigId());
                marches.forEach(m -> {
                    // Supprimer les fichiers DCE liés
                    fichierDceRepository.findByAppelOffreId(m.getReference())
                            .forEach(f -> fichierDceRepository.delete(f));
                    appelOffreRepository.delete(m);
                });
                configurationRobotRepository.deleteById(user.getConfigId());
            }
            utilisateurRepository.delete(user);
            log.info("[ADMIN] Utilisateur {} supprimé avec sa configuration et ses données.", user.getNomUtilisateur());
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès."));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/admin/users/{id}/activer */
    @PatchMapping("/users/{id}/activer")
    public ResponseEntity<?> activerCompte(@PathVariable String id) {
        return utilisateurRepository.findById(id).map(user -> {
            user.setActif(true);
            utilisateurRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Compte activé."));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/admin/users/{id}/desactiver */
    @PatchMapping("/users/{id}/desactiver")
    public ResponseEntity<?> desactiverCompte(@PathVariable String id) {
        return utilisateurRepository.findById(id).map(user -> {
            user.setActif(false);
            utilisateurRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Compte désactivé."));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/admin/users/{id}/roles */
    @PatchMapping("/users/{id}/roles")
    public ResponseEntity<?> changerRoles(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return utilisateurRepository.findById(id).map(user -> {
            @SuppressWarnings("unchecked")
            Set<String> newRoles = new HashSet<>((List<String>) body.get("roles"));
            user.setRoles(newRoles);
            utilisateurRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Rôles mis à jour.", "roles", newRoles));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Retire le mot de passe de la réponse JSON */
    private Map<String, Object> sanitizeUser(Utilisateur u) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("nom", u.getNom());
        map.put("prenom", u.getPrenom());
        map.put("email", u.getEmail());
        map.put("nomUtilisateur", u.getNomUtilisateur());
        map.put("roles", u.getRoles());
        map.put("actif", u.isActif());
        map.put("poste", u.getPoste());
        map.put("configId", u.getConfigId());
        map.put("dateCreation", u.getDateCreation());
        return map;
    }
}

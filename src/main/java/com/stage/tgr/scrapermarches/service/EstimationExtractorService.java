package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.model.FichierDce;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.FichierDceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class EstimationExtractorService {

    private final FichierDceRepository fichierDceRepository;
    private final AppelOffreRepository appelOffreRepository;

    public void extraireEstimation(AppelOffre appelOffre) {
        log.info("[NLP] Démarrage extraction pour : {}", appelOffre.getReference());

        // CORRECTION CRITIQUE : on cherche par référence (comme elle est stockée lors du save)
        List<FichierDce> fichiers = fichierDceRepository.findByAppelOffreId(appelOffre.getReference());

        if (fichiers.isEmpty()) {
            log.warn("[NLP] Aucun fichier DCE trouvé pour la référence '{}'", appelOffre.getReference());
            return;
        }

        log.info("[NLP] {} fichier(s) trouvé(s) pour ce marché", fichiers.size());

        // Trouver le fichier d'Avis FRANÇAIS - en excluant explicitement les documents arabes
        FichierDce fichierAvis = fichiers.stream()
                .filter(f -> {
                    String nom = f.getNomFichier().toLowerCase();
                    // Exclure les fichiers arabes
                    boolean estArabe = nom.contains("arabe") || nom.contains("arab") || nom.contains("عر");
                    if (estArabe) return false;
                    // Privilégier les fichiers français
                    return nom.matches(".*avis.*fran[cç]ais.*")
                        || nom.matches(".*([^a-z]|^)af([^a-z]|$).*")
                        || nom.matches(".*avis d'appel.*")
                        || nom.contains("francais")
                        || nom.contains("français");
                })
                .findFirst()
                // 2ème tentative : fichier "avis" sans mention arabe
                .orElseGet(() -> fichiers.stream()
                        .filter(f -> {
                            String nom = f.getNomFichier().toLowerCase();
                            boolean estArabe = nom.contains("arabe") || nom.contains("arab");
                            return !estArabe && (nom.contains("avis") || nom.startsWith("af") || nom.startsWith("ao"));
                        })
                        .findFirst()
                        // 3ème tentative : n'importe quel PDF/Word qui n'est pas arabe
                        .orElseGet(() -> fichiers.stream()
                                .filter(f -> {
                                    String n = f.getNomFichier().toLowerCase();
                                    boolean estArabe = n.contains("arabe") || n.contains("arab");
                                    return !estArabe && (n.endsWith(".pdf") || n.endsWith(".docx") || n.endsWith(".doc"));
                                })
                                .findFirst().orElse(null)));

        if (fichierAvis == null) {
            log.warn("[NLP] Aucun document utilisable pour le marché {}", appelOffre.getReference());
            return;
        }

        log.info("[NLP] Analyse du fichier : {}", fichierAvis.getNomFichier());
        String texteExtrait = "";

        try (ByteArrayInputStream bis = new ByteArrayInputStream(fichierAvis.getDonnees())) {
            String nom = fichierAvis.getNomFichier().toLowerCase();

            if (nom.endsWith(".pdf")) {
                try (PDDocument document = PDDocument.load(bis)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    texteExtrait = stripper.getText(document);
                }
            } else if (nom.endsWith(".docx")) {
                try (XWPFDocument docx = new XWPFDocument(bis);
                     XWPFWordExtractor extractor = new XWPFWordExtractor(docx)) {
                    texteExtrait = extractor.getText();
                }
            } else if (nom.endsWith(".doc")) {
                try (HWPFDocument doc = new HWPFDocument(bis);
                     WordExtractor extractor = new WordExtractor(doc)) {
                    texteExtrait = extractor.getText();
                }
            } else {
                log.warn("[NLP] Format non supporté : {}", nom);
                return;
            }

            // Normalisation agressive du texte
            texteExtrait = texteExtrait
                .replaceAll("\u00a0", " ")   // espaces insécables
                .replaceAll("\r\n|\r|\n", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();

            log.info("[NLP] Texte extrait ({} caractères), recherche du montant...", texteExtrait.length());

            // Patterns NLP par ordre de priorité, du plus spécifique au plus général
            String[] patterns = {
                // Pattern 1 : montant entre parenthèses "(3 100 020,00 DH TTC)" - le plus fiable
                "\\(([\\d][\\d\\s,.]+)\\s*(?:DH|MAD)\\s*(?:TTC|HT)?\\)",
                // Pattern 2 : "fixée à la somme de" puis texte puis parenthèse avec chiffre
                "fix[eé]e?\\s+(?:à|a)\\s+la\\s+somme\\s+de[\\s:]+[^(]*\\(([\\d][\\d\\s,.]+)\\s*(?:DH|MAD)",
                // Pattern 3 : "somme de ... DH/MAD/dirhams"
                "somme de[\\s:]*(\\d[\\d\\s,.]+)\\s*(?:DH|MAD|dirhams?|TTC)",
                // Pattern 4 : "montant estimé / prévisionnel ... DH/MAD"
                "montant\\s+(?:estim[eé]|pr[eé]visionnel)[^\\d]{0,50}(\\d[\\d\\s,.]+)\\s*(?:DH|MAD|dirhams?|TTC)?",
                // Pattern 5 : "budget estimé/prévisionnel"
                "budget\\s+(?:estim[eé]|pr[eé]visionnel)[^\\d]{0,50}(\\d[\\d\\s,.]+)\\s*(?:DH|MAD|dirhams?|TTC)?",
                // Pattern 6 : "estimation .* DH"
                "estimation[^\\d]{0,50}(\\d[\\d\\s,.]{3,})\\s*(?:DH|MAD|dirhams?|TTC)",
                // Pattern 7 : montant générique suivi de DH/MAD (dernier recours)
                "(\\d[\\d\\s,.]{4,})\\s*(?:DH|MAD)(?:\\s|$|TTC)"
            };

            for (String patternStr : patterns) {
                Pattern pattern = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
                Matcher matcher = pattern.matcher(texteExtrait);

                if (matcher.find()) {
                    // Récupérer le montant capturé par le groupe 1 du pattern
                    String montantCapture = matcher.group(1).trim();
                    // Nettoyage : supprimer tous les espaces dans le nombre brut
                    String nombrePropre = montantCapture.replaceAll("\\s+", "").trim();
                    // Reformatage en style français : 3 100 020,00 DH
                    String montantFinal = formaterMontant(nombrePropre) + " DH";

                    log.info("[NLP] Estimation extraite : {} (via pattern {})", montantFinal, patternStr.substring(0, 20));
                    appelOffre.setEstimationCout(montantFinal);
                    appelOffreRepository.save(appelOffre);
                    return;
                }
            }

            log.warn("[NLP] Aucun montant trouvé dans le document '{}' malgré {} caractères analysés.",
                     fichierAvis.getNomFichier(), texteExtrait.length());

        } catch (Exception e) {
            log.error("[NLP] Erreur lors de l'extraction du document '{}' : {}", fichierAvis.getNomFichier(), e.getMessage());
        }
    }

    /**
     * Formate un montant brut (ex: "3100020,00" ou "3100020.00")
     * en format français avec espaces séparateurs : "3 100 020,00"
     */
    private String formaterMontant(String montantBrut) {
        try {
            String normalise = montantBrut.replace(".", ",");
            String[] parts = normalise.split(",");
            String partieEntiere = parts[0].replaceAll("[^\\d]", "");
            String partieDecimale = parts.length > 1 ? parts[1].replaceAll("[^\\d]", "") : "";

            StringBuilder sb = new StringBuilder();
            int count = 0;
            for (int i = partieEntiere.length() - 1; i >= 0; i--) {
                if (count > 0 && count % 3 == 0) sb.insert(0, ' ');
                sb.insert(0, partieEntiere.charAt(i));
                count++;
            }

            String resultat = sb.toString();
            if (!partieDecimale.isEmpty()) {
                if (partieDecimale.length() == 1) partieDecimale += "0";
                resultat += "," + partieDecimale.substring(0, Math.min(2, partieDecimale.length()));
            }
            return resultat;
        } catch (Exception e) {
            return montantBrut;
        }
    }
}

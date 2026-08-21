package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.dto.AppelOffreDTO;
import com.stage.tgr.scrapermarches.mapper.AppelOffreMapper;
import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import io.github.bonigarcia.wdm.WebDriverManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.openqa.selenium.JavascriptExecutor;
import org.springframework.scheduling.annotation.Scheduled;

import com.stage.tgr.scrapermarches.repository.FichierDceRepository;
import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import com.stage.tgr.scrapermarches.repository.ConfigurationRobotRepository;

@Service
@Slf4j
@RequiredArgsConstructor
public class ScrapingService {

    private final AppelOffreRepository repository;
    private final AppelOffreMapper mapper;
    private final FichierDceRepository fichierDceRepository;
    private final ConfigurationRobotRepository configRepository;
    private final TelechargementDceService telechargementDceService;
    private final EstimationExtractorService estimationExtractorService;

    @Scheduled(cron = "0 0 1 * * ?") // 1h du matin tous les jours
    public void extractionAutomatiqueType1() {
        log.info("Lancement planifié (1h00) de l'extraction TYPE 1 (Acheteur)...");
        demarrerExtraction("ACHETEUR");
    }

    public void demarrerExtraction(String typeExtraction) {
        // Appel générique - utilise la 1ère config trouvée (planifié ou admin)
        ConfigurationRobot config = configRepository.findAll().stream().findFirst().orElse(
                ConfigurationRobot.builder()
                        .acheteurCible("POSTE MAROC")
                        .emailNotification("test@test.com")
                        .limiteResultats(50)
                        .build()
        );
        demarrerExtractionAvecConfig(typeExtraction, config);
    }

    /**
     * Lancement de l'extraction pour un membre spécifique avec SA propre config
     */
    public void demarrerExtractionPourMembre(String typeExtraction, String configId) {
        if (configId == null) {
            log.warn("Aucune configuration associée à ce membre, extraction annulée.");
            return;
        }
        ConfigurationRobot config = configRepository.findById(configId).orElse(null);
        if (config == null) {
            log.warn("Configuration {} introuvable.", configId);
            return;
        }
        demarrerExtractionAvecConfig(typeExtraction, config);
    }

    private void demarrerExtractionAvecConfig(String typeExtraction, ConfigurationRobot config) {
        log.info("Démarrage du robot d'extraction des marchés publics. TYPE = {}", typeExtraction);

        // Purge uniquement des données de cette configuration
        if (config.getId() != null) {
            List<com.stage.tgr.scrapermarches.model.AppelOffre> anciens = repository.findByConfigId(config.getId());
            anciens.forEach(m -> {
                fichierDceRepository.findByAppelOffreId(m.getReference()).forEach(fichierDceRepository::delete);
                repository.delete(m);
            });
            log.info("Données précédentes de la configuration {} supprimées.", config.getId());
        } else {
            repository.deleteAll();
            fichierDceRepository.deleteAll();
            log.warn("Purge totale de la base de données.");
        }
        
        String acheteurCible = config.getAcheteurCible();
        int limiteResultats = config.getLimiteResultats();

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-allow-origins=*");
        // Paramètres indispensables pour l'exécution sur serveur (Linux/Docker) sans interface graphique
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--start-maximized");
        options.addArguments("--window-size=1920,1080");
        WebDriver driver = new ChromeDriver(options);
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(20));
        JavascriptExecutor js = (JavascriptExecutor) driver;

        try {
            driver.get("https://www.marchespublics.gov.ma/index.php?page=entreprise.EntrepriseAdvancedSearch&searchAnnCons");
            wait.until(ExpectedConditions.presenceOfElementLocated(By.tagName("form")));

            if ("ACHETEUR".equals(typeExtraction)) {
                // --- TYPE 1 : Acheteur + Dates ---
                log.info("Application des filtres TYPE 1...");
                WebElement champAcheteur = wait.until(ExpectedConditions.elementToBeClickable(By.id("ctl0_CONTENU_PAGE_AdvancedSearch_orgName")));
                champAcheteur.clear();
                champAcheteur.sendKeys(acheteurCible);

                WebElement premierResultatAcheteur = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//div[@id='ctl0_CONTENU_PAGE_AdvancedSearch_orgName_result']//li")));
                premierResultatAcheteur.click();
                Thread.sleep(1000);

                DateTimeFormatter formatteur = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                String dateDuJour = config.getDateDebutRecherche() != null ? config.getDateDebutRecherche().format(formatteur) : LocalDate.now().format(formatteur);
                String dateFin = config.getDateFinRecherche() != null ? config.getDateFinRecherche().format(formatteur) : LocalDate.now().plusMonths(1).format(formatteur);

                WebElement champDateDebut = driver.findElement(By.id("ctl0_CONTENU_PAGE_AdvancedSearch_dateMiseEnLigneStart"));
                champDateDebut.clear();
                champDateDebut.sendKeys(dateDuJour);
                champDateDebut.sendKeys(Keys.TAB);

                WebElement champDateFin = driver.findElement(By.id("ctl0_CONTENU_PAGE_AdvancedSearch_dateMiseEnLigneEnd"));
                champDateFin.clear();
                champDateFin.sendKeys(dateFin);
                champDateFin.sendKeys(Keys.TAB);
                Thread.sleep(500);

            } else if ("MOT_CLE".equals(typeExtraction)) {
                // --- TYPE 2 : Uniquement le Mot Clé ---
                log.info("Application des filtres TYPE 2...");
                if (config.getMotCleRecherche() != null && !config.getMotCleRecherche().trim().isEmpty()) {
                    try {
                        String jsScript = 
                            "var labels = document.querySelectorAll('label');" +
                            "for (var i=0; i<labels.length; i++) {" +
                            "  if (labels[i].innerText.toLowerCase().includes('objet de la consultation') || labels[i].innerText.toLowerCase().includes('mots clés')) {" +
                            "    var input = labels[i].closest('div').querySelector('input[type=text]') || labels[i].parentElement.parentElement.querySelector('input[type=text]');" +
                            "    if (input) return input;" +
                            "  }" +
                            "}" +
                            "return document.getElementById('ctl0_CONTENU_PAGE_AdvancedSearch_motsCles') || document.querySelector('input[name*=\"motsCles\"]');";
                        
                        WebElement champMotsCles = (WebElement) js.executeScript(jsScript);
                        if (champMotsCles != null) {
                            champMotsCles.clear();
                            champMotsCles.sendKeys(config.getMotCleRecherche());
                            log.info("Champ mot-clé trouvé et rempli avec succès.");
                        } else {
                            log.warn("Champ mots-clés introuvable sur la page.");
                        }
                    } catch (Exception e) {
                        log.warn("Erreur lors de la saisie du champ mots clés : {}", e.getMessage());
                    }
                } else {
                    log.warn("L'extraction TYPE 2 a été lancée mais le mot-clé est vide dans la configuration !");
                }
            }

            log.info("Configuration des options de recherche...");
            WebElement radioRechercheExacte = wait.until(ExpectedConditions.presenceOfElementLocated(
                    By.id("ctl0_CONTENU_PAGE_AdvancedSearch_exact")
            ));
            if (!radioRechercheExacte.isSelected()) {
                wait.until(ExpectedConditions.elementToBeClickable(radioRechercheExacte)).click();
                log.info("Bouton radio 'Recherche exacte' sélectionné avec succès.");
            } else {
                log.info("Le bouton 'Recherche exacte' était déjà sélectionné par défaut.");
            }

            // --- 3. Lancement de la recherche ---
            driver.findElement(By.id("ctl0_CONTENU_PAGE_AdvancedSearch_lancerRecherche")).click();

            // Attente des résultats
            try {
                wait.until(ExpectedConditions.presenceOfElementLocated(By.className("col-90")));
                Thread.sleep(1000); // Laisser le DOM se stabiliser complètement
            } catch (org.openqa.selenium.TimeoutException e) {
                log.info("0 résultat trouvé ou le tableau n'a pas pu être chargé. Le processus se termine proprement sans erreur.");
                return;
            }

            // --- 4. Extraction via JavaScript (robuste, ne dépend pas de findElement ligne par ligne) ---
            int countSauvegardes = 0;
            boolean hasNextPage = true;
            int page = 1;

            while (hasNextPage) {
                log.info("Extraction de la page {}...", page);
                Thread.sleep(1500);

                // Script JS qui lit tout le tableau et retourne les données en JSON
                String script =
                    "var rows = document.querySelectorAll('td.col-450');" +
                    "var results = [];" +
                    "rows.forEach(function(cell) {" +
                    "  try {" +
                    "    var ref = cell.querySelector('.ref') ? cell.querySelector('.ref').innerText.trim() : '';" +
                    "    var objet = '';" +
                    "    var acheteur = '';" +
                    "    var objetDiv = cell.querySelector('#' + cell.closest('tr').querySelector('[id*=panelBlocObjet]').id);" +
                    "    if (objetDiv) objet = objetDiv.innerText.replace('Objet :', '').trim();" +
                    "    var acheteurDiv = cell.querySelector('[id*=panelBlocDenomination]');" +
                    "    if (acheteurDiv) acheteur = acheteurDiv.innerText.replace('Acheteur public :', '').trim();" +
                    "    var tr = cell.closest('tr');" +
                    "    var dateCell = tr.querySelector('td.col-60 .cloture-line');" +
                    "    var date = dateCell ? dateCell.innerText.trim().replace('\\n', ' ') : '';" +
                    "    var lieuCell = tr.querySelector('td.col-90 [id*=panelBlocLieuxExec]');" +
                    "    var lieu = lieuCell ? lieuCell.innerText.trim() : '';" +
                    "    var lienCell = tr.querySelector('td.actions a img[src*=picto-acces-consultation]');" +
                    "    var url = lienCell ? lienCell.parentElement.href : '';" +
                    "    if (ref) results.push({ref:ref, objet:objet, acheteur:acheteur, date:date, lieu:lieu, url:url});" +
                    "  } catch(e) {}" +
                    "});" +
                    "return JSON.stringify(results);";

                String jsonResult = (String) js.executeScript(script);
                log.info("JS extraction page {} : données brutes reçues ({} caractères)", page, jsonResult.length());

                // Parsing manuel du JSON simple
                jsonResult = jsonResult.trim();
                if (jsonResult.equals("[]") || jsonResult.isEmpty()) {
                    log.info("Aucune donnée extraite sur la page {}.", page);
                    hasNextPage = false;
                    break;
                }

                // Découpe du JSON en objets individuels
                jsonResult = jsonResult.substring(1, jsonResult.length() - 1); // enlever [ ]
                String[] objets = jsonResult.split("\\},\\{");

                for (String objStr : objets) {
                    if (limiteResultats != -1 && countSauvegardes >= limiteResultats) {
                        log.info("Limite de {} marchés atteinte.", limiteResultats);
                        hasNextPage = false;
                        break;
                    }

                    try {
                        String ref = extractJsonField(objStr, "ref");
                        String objet = extractJsonField(objStr, "objet");
                        String acheteur = extractJsonField(objStr, "acheteur");
                        String date = extractJsonField(objStr, "date");
                        String lieu = extractJsonField(objStr, "lieu");
                        String url = extractJsonField(objStr, "url");

                        if (ref.isEmpty()) continue;
                        if ("ACHETEUR".equals(typeExtraction) && !acheteur.toLowerCase().contains(acheteurCible.toLowerCase())) {
                            continue;
                        }

                        log.info("Marché trouvé : [{}] {} - Acheteur: {}", ref, objet.substring(0, Math.min(50, objet.length())), acheteur);

                        AppelOffreDTO dto = AppelOffreDTO.builder()
                                .reference(ref)
                                .objet(objet)
                                .acheteurPublic(acheteur)
                                .lieuExecution(lieu)
                                .dateLimiteBrute(date)
                                .urlDce(url)
                                .build();

                        AppelOffre entite = mapper.toEntity(dto);
                        entite.setConfigId(config.getId()); // lier à la config du membre

                        // RG-01 : Gestion des doublons (Upsert natif via Spring Data MongoDB)
                        if (repository.existsById(entite.getId())) {
                            log.info("🔄 Mise à jour du marché existant : {}", entite.getId());
                        } else {
                            log.info("✅ Nouveau marché inséré : {}", entite.getId());
                        }

                        repository.save(entite);
                        countSauvegardes++;
                    } catch (Exception e) {
                        log.warn("Objet ignoré lors du parsing : {}", e.getMessage());
                    }
                }

                if (!hasNextPage) break;

                // Pagination : bouton suivant
                try {
                    List<WebElement> boutonsSuivant = driver.findElements(By.xpath("//a[contains(@title,'Page suivante') or contains(text(),'>')]"));
                    if (!boutonsSuivant.isEmpty() && boutonsSuivant.get(0).isDisplayed()) {
                        boutonsSuivant.get(0).click();
                        page++;
                        Thread.sleep(3000);
                    } else {
                        hasNextPage = false;
                    }
                } catch (Exception e) {
                    hasNextPage = false;
                }
            }

            log.info("✅ Synchronisation terminée : {} marchés sauvegardés dans MongoDB.", countSauvegardes);
            
            // --- 5. Téléchargement des DCE pour les marchés qui n'ont pas encore leurs fichiers ---
            log.info("Recherche de marchés sans DCE téléchargé...");
            List<AppelOffre> tousLesMarches = repository.findAll();
            for (AppelOffre ao : tousLesMarches) {
                if (!ao.isDceTelecharge() && "Ouvert".equals(ao.getStatut()) && ao.getUrlDce() != null && !ao.getUrlDce().isEmpty()) {
                    log.info("Lancement du téléchargement DCE pour le marché : {}", ao.getReference());
                    telechargementDceService.telechargerDce(ao);
                    estimationExtractorService.extraireEstimation(ao);
                } else if (ao.isDceTelecharge() && ao.getEstimationCout() == null) {
                    estimationExtractorService.extraireEstimation(ao);
                }
            }
            log.info("✅ Tous les DCE manquants ont été traités.");

        } catch (Exception e) {
            log.error("Erreur critique lors de l'extraction : ", e);
        } finally {
            // driver.quit(); // Garde-le commenté pour ta démo !
        }
    }

    /**
     * Extrait la valeur d'un champ dans une chaîne JSON simple (sans bibliothèque externe).
     */
    private String extractJsonField(String json, String field) {
        try {
            String key = "\"" + field + "\":\"";
            int start = json.indexOf(key);
            if (start == -1) return "";
            start += key.length();
            int end = json.indexOf("\"", start);
            if (end == -1) return "";
            return json.substring(start, end)
                    .replace("\\n", " ")
                    .replace("\\t", " ")
                    .replace("\\\"", "\"")
                    .trim();
        } catch (Exception e) {
            return "";
        }
    }
}
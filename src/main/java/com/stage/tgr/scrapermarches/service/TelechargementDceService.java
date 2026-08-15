package com.stage.tgr.scrapermarches.service;

import com.stage.tgr.scrapermarches.model.AppelOffre;
import com.stage.tgr.scrapermarches.model.FichierDce;
import com.stage.tgr.scrapermarches.repository.AppelOffreRepository;
import com.stage.tgr.scrapermarches.repository.FichierDceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelechargementDceService {

    private final AppelOffreRepository repository;
    private final FichierDceRepository fichierDceRepository;
    
    private final String DOWNLOAD_DIR = System.getProperty("user.dir") + File.separator + "dce_downloads";

    public void telechargerDce(AppelOffre appelOffre) {
        if (appelOffre.getUrlDce() == null || appelOffre.getUrlDce().isEmpty()) {
            log.warn("Aucune URL DCE pour le marché {}", appelOffre.getReference());
            return;
        }

        String dossierMarcheNom = appelOffre.getReference().replaceAll("[^a-zA-Z0-9_-]", "_");
        String cheminDossierMarche = DOWNLOAD_DIR + File.separator + dossierMarcheNom;
        
        File dossier = new File(cheminDossierMarche);
        if (!dossier.exists()) {
            dossier.mkdirs();
        }

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-allow-origins=*");
        options.addArguments("--start-maximized");
        // options.addArguments("--headless=new"); // On garde visible pour voir s'il y a un captcha ou autre blocage

        Map<String, Object> prefs = new HashMap<>();
        prefs.put("download.default_directory", cheminDossierMarche);
        prefs.put("download.prompt_for_download", false);
        prefs.put("download.directory_upgrade", true);
        options.setExperimentalOption("prefs", prefs);

        WebDriver driver = new ChromeDriver(options);
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(30));

        try {
            log.info("Accès à l'URL DCE du marché : {}", appelOffre.getReference());
            driver.get(appelOffre.getUrlDce());

            // 1. Cliquer sur le lien "Dossier de consultation"
            WebElement lienDossier = wait.until(ExpectedConditions.elementToBeClickable(
                    By.xpath("//a[contains(., 'Dossier de consultation') or contains(@href, 'demandeDCE')]")
            ));
            lienDossier.click();

            // 2. Remplir le formulaire
            Thread.sleep(3000); 
            
            // Trouver les champs par des attributs précis pour éviter de remplir la barre de recherche
            WebElement inputNom = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.xpath("//input[contains(@id, 'nom') or contains(@name, 'nom')]")
            ));
            inputNom.clear();
            inputNom.sendKeys("Test");

            WebElement inputPrenom = driver.findElement(By.xpath("//input[contains(@id, 'prenom') or contains(@name, 'prenom')]"));
            inputPrenom.clear();
            inputPrenom.sendKeys("Test");

            WebElement inputEmail = driver.findElement(By.xpath("//input[contains(@id, 'email') or contains(@id, 'courriel')]"));
            inputEmail.clear();
            inputEmail.sendKeys("test@gmail.com");
            
            // Cocher la case d'acceptation via JS par sécurité
            try {
                WebElement checkbox = driver.findElement(By.xpath("//input[@type='checkbox']"));
                if (!checkbox.isSelected()) {
                    ((JavascriptExecutor) driver).executeScript("arguments[0].click();", checkbox);
                }
            } catch(Exception e) {
                log.warn("Case à cocher non trouvée.");
            }

            // Bouton Valider : On s'assure de cliquer sur le bouton "Valider" et NON sur un autre bouton "Submit" (comme la recherche)
            WebElement btnValider = driver.findElement(By.xpath("//input[@value='Valider' or contains(@id, 'Valider') or contains(@id, 'validate')]"));
            // On utilise le clic natif, s'il échoue on passe au JS
            try {
                btnValider.click();
            } catch (Exception e) {
                ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btnValider);
            }

            // 3. Page finale : Cliquer sur le bouton "Télécharger"
            Thread.sleep(4000); // Attendre la validation
            
            // On utilise presenceOfElementLocated plutôt que elementToBeClickable pour éviter le Timeout si un autre div le chevauche
            WebElement btnTelecharger = wait.until(ExpectedConditions.presenceOfElementLocated(
                    By.id("ctl0_CONTENU_PAGE_EntrepriseDownloadDce_completeDownload")
            ));
            
            // Clic forcé via JS car le bouton peut être masqué ou recouvert par le CSS du portail
            ((JavascriptExecutor) driver).executeScript("arguments[0].click();", btnTelecharger);

            // 4. Attendre et lire le ZIP
            log.info("Téléchargement lancé, attente du ZIP...");
            File zipFile = attendreFichierZip(dossier);
            
            if (zipFile != null) {
                log.info("ZIP détecté : {}", zipFile.getName());
                // On passe la référence pour lier les fichiers au marché dans MongoDB
                List<String> documentsExtraits = decompresserEtStockerMongo(zipFile, appelOffre.getReference());
                
                appelOffre.setDceTelecharge(true);
                appelOffre.setNomsFichiers(documentsExtraits);
                repository.save(appelOffre);
                log.info("Fichiers stockés dans MongoDB avec succès !");
            } else {
                log.error("ZIP non téléchargé (délai dépassé).");
            }

        } catch (Exception e) {
            log.error("Erreur lors du téléchargement du DCE pour le marché {}: {}", appelOffre.getReference(), e.getMessage());
        } finally {
            driver.quit();
            // Nettoyage complet du dossier local, car tout est dans Mongo maintenant
            deleteDirectory(dossier);
        }
    }

    private File attendreFichierZip(File dossier) throws InterruptedException {
        int timeout = 60;
        for (int i = 0; i < timeout; i++) {
            File[] files = dossier.listFiles((dir, name) -> name.toLowerCase().endsWith(".zip") && !name.endsWith(".crdownload"));
            if (files != null && files.length > 0) {
                Thread.sleep(2000); // S'assurer que l'écriture disque est bien terminée
                return files[0];
            }
            Thread.sleep(1000);
        }
        return null;
    }

    private List<String> decompresserEtStockerMongo(File zipFile, String referenceMarche) {
        List<String> nomsFichiers = new ArrayList<>();
        byte[] buffer = new byte[4096];
        
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry zipEntry = zis.getNextEntry();
            while (zipEntry != null) {
                if (!zipEntry.isDirectory()) {
                    String cleanName = new File(zipEntry.getName()).getName();
                    String lowerName = cleanName.toLowerCase();
                    
                    if (lowerName.endsWith(".pdf") || lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) {
                        
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            baos.write(buffer, 0, len);
                        }
                        byte[] fileData = baos.toByteArray();
                        
                        String contentType = "application/octet-stream";
                        if (lowerName.endsWith(".pdf")) contentType = "application/pdf";
                        
                        FichierDce fichierDb = FichierDce.builder()
                                .appelOffreId(referenceMarche)
                                .nomFichier(cleanName)
                                .donnees(fileData)
                                .contentType(contentType)
                                .build();
                                
                        fichierDceRepository.save(fichierDb);
                        nomsFichiers.add(cleanName);
                    }
                }
                zipEntry = zis.getNextEntry();
            }
        } catch (Exception e) {
            log.error("Erreur décompression ZIP : ", e);
        }
        return nomsFichiers;
    }
    
    private void deleteDirectory(File directoryToBeDeleted) {
        File[] allContents = directoryToBeDeleted.listFiles();
        if (allContents != null) {
            for (File file : allContents) {
                deleteDirectory(file);
            }
        }
        directoryToBeDeleted.delete();
    }
}

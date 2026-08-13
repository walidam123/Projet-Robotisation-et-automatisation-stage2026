package com.stage.tgr.scrapermarches;

import com.stage.tgr.scrapermarches.service.ScrapingService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.stage.tgr")
@org.springframework.data.mongodb.repository.config.EnableMongoRepositories(basePackages = "com.stage.tgr")
@EnableScheduling
public class ScraperMarchesApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScraperMarchesApplication.class, args);
    }
    // L'exécution automatique au démarrage a été désactivée.
    // L'utilisateur (Président) peut maintenant lancer l'extraction et tester les alertes depuis l'interface web.
    /*
    @Bean
    CommandLineRunner demarrerSimulationAutomatique(com.stage.tgr.scrapermarches.service.ScrapingService scrapingService,
                                                    com.stage.tgr.scrapermarches.service.StatutService statutService) {
        return args -> {
            scrapingService.demarrerExtraction();
            statutService.mettreAJourStatutsClotures();
        };
    }
    */
}

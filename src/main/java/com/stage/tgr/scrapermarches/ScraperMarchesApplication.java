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
// Le CommandLineRunner permet de lancer l'extraction automatiquement dès que tu lances l'application Spring Boot
    // C'est l'idéal pour ta présentation : tu cliques sur "Play" dans IntelliJ et le navigateur s'ouvre tout seul !
    @Bean
    CommandLineRunner demarrerSimulationAutomatique(ScrapingService scrapingService) {
        return args -> {
            scrapingService.demarrerExtraction();
        };
    }
}

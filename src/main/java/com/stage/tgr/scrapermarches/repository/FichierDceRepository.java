package com.stage.tgr.scrapermarches.repository;

import com.stage.tgr.scrapermarches.model.FichierDce;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FichierDceRepository extends MongoRepository<FichierDce, String> {
    List<FichierDce> findByAppelOffreId(String appelOffreId);
}

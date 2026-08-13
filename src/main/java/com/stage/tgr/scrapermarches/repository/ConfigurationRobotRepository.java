package com.stage.tgr.scrapermarches.repository;

import com.stage.tgr.scrapermarches.model.ConfigurationRobot;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfigurationRobotRepository extends MongoRepository<ConfigurationRobot, String> {
}

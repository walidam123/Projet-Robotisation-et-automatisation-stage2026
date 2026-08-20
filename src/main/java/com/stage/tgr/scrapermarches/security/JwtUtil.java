package com.stage.tgr.scrapermarches.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.Set;

@Component
@Slf4j
public class JwtUtil {

    @Value("${app.jwt.secret:RobotDCE_SecretKey_SuperLongue_QuePersonneNePeutDeviner_2026!}")
    private String jwtSecret;

    private static final long JWT_EXPIRATION_MS = 8 * 60 * 60 * 1000L; // 8 heures

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /**
     * Génère un JWT minimaliste : contient uniquement userId, roles, nomUtilisateur
     * JAMAIS l'email ni le mot de passe
     */
    public String generateToken(String userId, String nomUtilisateur, Set<String> roles) {
        return Jwts.builder()
                .setSubject(userId)
                .claim("nomUtilisateur", nomUtilisateur)
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + JWT_EXPIRATION_MS))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUserId(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractNomUtilisateur(String token) {
        return parseClaims(token).get("nomUtilisateur", String.class);
    }

    @SuppressWarnings("unchecked")
    public Set<String> extractRoles(String token) {
        Object roles = parseClaims(token).get("roles");
        if (roles instanceof java.util.List) {
            return new java.util.HashSet<>((java.util.List<String>) roles);
        }
        return new java.util.HashSet<>();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("[JWT] Token expiré.");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[JWT] Token invalide : {}", e.getMessage());
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}

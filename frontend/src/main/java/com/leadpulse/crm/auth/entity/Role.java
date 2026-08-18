package com.leadpulse.crm.auth.entity;

public enum Role {
    ROLE_PARTNER("Managing Partner"),
    ROLE_SENIOR_CONSULTANT("Senior Consultant"),
    ROLE_FINANCIAL_ANALYST("Financial Analyst"),
    ROLE_CLIENT_PORTAL("Client Portal User"),
    ROLE_ADMIN("System Administrator");

    private final String description;

    Role(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}

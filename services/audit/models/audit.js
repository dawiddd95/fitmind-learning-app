// Import typów danych Sequelize
const { DataTypes } = require("sequelize"); 
// Import połączenia z bazą danych
// Używamy { sequelize } ponieważ eksportujemy z ../config/database
// dwie rzeczy module.exports = { sequelize, testDatabaseConnection };
// const sequelize importuje obie te rzeczy po nazwą sequelize
// natomiast const { sequelize } importuje tylko sequelize 
const { sequelize } = require("../config/database"); 

// Definicja modelu Audit
const Audit = sequelize.define(
    "Audit", 
    {
        // Unikalny identyfikator zdarzenia
        id: {
            // Typ danych: liczba całkowita
            type: DataTypes.INTEGER, 
            // Klucz główny
            primaryKey: true, 
            // Automatyczne zwiększanie wartości
            autoIncrement: true, 
        },
        // Typ zdarzenia, np. logowanie, rejestracja
        eventType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Kto wykonał akcję, np. email użytkownika lub identyfikator systemu
        performedBy: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // W jakim serwisie miało miejsce zdarzenie, np. auth-service, user-service
        service: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Status akcji, np. sukces lub porażka
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'SUCCESS',
            validate: {
                isIn: [['SUCCESS', 'FAILURE']],
            },
        },
        // Poziom ważności zdarzenia
        severity: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'INFO',
            validate: {
                isIn: [['INFO', 'WARNING', 'ERROR']],
            },
        },
        // Znacznik czasu zdarzenia
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        // Adres IP usera (jeśli dostępny)
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // Lokalizacja usera, np. 'Warszawa, Polska'
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // Identyfikator sesji, jeśli dotyczy
        sessionId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // Agent użytkownika, np. przeglądarka lub urządzenie
        userAgent: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // Dodatkowe szczegóły związane z akcją, np. zmiany w danych
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        // Data wygaśnięcia logu, przydatna dla automatycznego czyszczenia
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, 
    {
        tableName: "Audit", // Dokładna nazwa tabeli z wielką literą
        timestamps: true, // Dodaje createdAt i updatedAt
        // Indeksy w bazach danych służą do optymalizacji wyszukiwania danych i poprawy wydajności zapytań
        indexes: [
            // przyspieszenie zapytań, które filtrują dane na podstawie eventType, entity, performedBy, i timestamp
            { fields: ['eventType', 'performedBy', 'timestamp'] },
            // Indeks dla automatycznego usuwania logów po 90 dniach
            { fields: ['timestamp'], using: 'BTREE' },
        ],
    }
);

module.exports = Audit;

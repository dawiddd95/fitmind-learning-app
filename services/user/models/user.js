// Import typów danych Sequelize
const { DataTypes } = require("sequelize"); 
// Import połączenia z bazą danych
// Używamy { sequelize } ponieważ eksportujemy z ../config/database
// dwie rzeczy module.exports = { sequelize, testDatabaseConnection };
// const sequelize importuje obie te rzeczy po nazwą sequelize
// natomiast const { sequelize } importuje tylko sequelize 
const { sequelize } = require("../config/database"); 

// Definicja modelu User
const User = sequelize.define(
  "User", 
  {
    // Unikalny identyfikator użytkownika
    id: {
      // Typ danych: liczba całkowita
      type: DataTypes.INTEGER, 
      // Klucz główny
      primaryKey: true, 
      // Automatyczne zwiększanie wartości
      autoIncrement: true, 
    },
    // Adres e-mail użytkownika
    email: {
      // Typ danych: tekst
      type: DataTypes.STRING, 
      // Wymagane pole, bo nie przyjmujemy nulli
      allowNull: false, 
      // Wartość musi być unikalna
      unique: true, 
      // Walidacja poprawności adresu e-mail
      validate: {
        isEmail: true, 
      },
    },
    // Hasło użytkownika
    password: {
      // Typ danych: tekst (przechowywane jako hash)
      type: DataTypes.STRING, 
      // Wymagane pole, bo nie przyjmujemy nulli
      allowNull: false, 
    },
    // Data urodzenia użytkownika
    dateOfBirth: {
      // Typ danych: data bez czasu
      type: DataTypes.DATEONLY, 
      // Pole opcjonalne, bo przyjmujemy null
      allowNull: true, 
    },
    // Płeć użytkownika
    gender: {
      // Dozwolone wartości
      type: DataTypes.ENUM("male", "female", "other"), 
      // Pole opcjonalne, bo przyjmujemy null
      allowNull: true,
    },
    // Waga użytkownika
    weight: {
      // Typ danych: liczba zmiennoprzecinkowa
      type: DataTypes.FLOAT, 
      // Pole opcjonalne
      allowNull: true, 
      // Waga nie może być ujemna
      validate: {
        min: 0, 
      },
    },
    // Staż treningowy użytkownika
    trainingExperience: {
      // Typ danych: liczba całkowita (np. liczba miesięcy)
      type: DataTypes.INTEGER, 
      // Pole opcjonalne
      allowNull: true, 
      // Staż nie może być ujemny
      validate: {
        min: 0, 
      },
    },
    // Cel treningowy użytkownika
    trainingGoal: {
      type: DataTypes.ENUM(
        // Utrzymanie wagi
        "maintain weight", 
        // Przybranie na masie
        "gain weight", 
        // Schudnięcie
        "lose weight", 
        // Przybranie masy mięśniowej
        "gain muscle" 
      ),
      // Pole opcjonalne
      allowNull: true, 
    },
    // Tablica alergenów użytkownika
    allergens: {
      // Typ danych: tablica stringów
      type: DataTypes.ARRAY(DataTypes.STRING), 
      // Pole opcjonalne
      allowNull: true, 
    },
    // Data utworzenia - automatycznie ustawiana przez Sequelize
    createdAt: {
      // Typ danych: data i czas
      type: DataTypes.DATE, 
      // Pole wymagane
      allowNull: false, 
      // Domyślna wartość: aktualna data i czas
      defaultValue: DataTypes.NOW, 
    },
    // Data aktualizacji - automatycznie ustawiana przez Sequelize
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "Users", // Dokładna nazwa tabeli z wielką literą
    timestamps: true,   // Dodaje createdAt i updatedAt
  }
);

// Eksport modelu User
module.exports = User;

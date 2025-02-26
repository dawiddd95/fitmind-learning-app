// Pozbywamy się Pool żeby nie pisać ool.query("SELECT * FROM users WHERE email = $1", [email])
// A zamiast tego używać ORM sequelize, który umożliwia mapowanie obiektów w kodzie na tabele w bazie danych,
// const { Pool } = require("pg"); // Import klienta PostgreSQL

// Import sequelize
const { Sequelize } = require("sequelize");
const fs = require("fs");

// Ścieżka do Docker Secrets dla DATABASE_URL
const databaseUrlPath = process.env.DATABASE_URL_FILE;

// Ścieżka do pliku z Docker Secrets
const databaseUrl = fs.readFileSync(databaseUrlPath, "utf8").trim();

if (!databaseUrl) {
  throw new Error("❌ User service - DATABASE_URL_FILE nie jest ustawione!");
}

// Inicjalizacja Sequelize
const sequelize = new Sequelize(databaseUrl, {
  // Typ bazy danych
  dialect: "postgres", 
  // Wyłącz logowanie zapytań SQL w konsoli
  // Możemy włączyć to na true, ALE TYLKO JEŚLI NIE JEST TO ŚRODOWISKO PRODUKCYJNE
  // na prod false, żeby minimalizować szanse wycieku informacji 
  // domyślnie po skończonym debugowaniu lepiej dawać na false
  logging: false, 
});

// Odkąd mamy sequelize to już nie jest potrzebne
// Tworzenie puli połączeń PostgreSQL
// const pool = new Pool({
//   connectionString: DATABASE_URL, // URL połączenia z bazą danych
// });

// Funkcja do testowania połączenia z bazą danych
async function testDatabaseConnection() {
  try {
    // Zastępujemy to:
    // Zapytanie testowe
    // const result = await pool.query("SELECT NOW()"); 
    // Na rzecz sequelize:
    // Test połączenia
    await sequelize.authenticate(); 
    // Synchronizacja modeli z bazą danych
    await sequelize.sync({ alter: true });
    console.log("✅ User service - Połączono z bazą danych PostgreSQL.");
  } catch (err) {
    console.error("❌ User service - Błąd połączenia z PostgreSQL:", err.message);
    process.exit(1); // Zakończ aplikację, jeśli nie można nawiązać połączenia 
  }
}

// Eksport puli połączeń i funkcji testującej
module.exports = {
  //    Zamiast:
  // pool, 
  //    to:
  // Instancja Sequelize do użycia w innych modułach
  sequelize, 
  // Funkcja testowa do sprawdzania połączenia
  testDatabaseConnection, 
};
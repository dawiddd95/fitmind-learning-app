const express = require("express");
// Niezbędne, aby nie pokazywało na FE błędów z CORS not allowed
const cors = require("cors");
const bodyParser = require("body-parser");
// Import konfiguracji Sequelize
const { sequelize } = require("./config/database");

// Obsługa Docker Secrets
const fs = require("fs");

// Importy dla swagger docs
const swaggerUi = require("swagger-ui-express");
// Importujemy YAML
const YAML = require("yamljs"); 

// Import endpointów serwisu
const userRoutes = require("./api");

const app = express();

app.use(cors())

// Parsowanie JSON w żądaniach
app.use(bodyParser.json());

// Wczytanie pliku Swagger (swagger.yaml)
const swaggerDocument = YAML.load('./swagger.yaml');

// Ustawienie Swagger UI na /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Pobieranie portu z pliku .env lub ustawienie domyślnego
const PORT = 4001;

// Debugowanie portu
console.log(`🚀 Uruchamiam serwis na porcie ${PORT}`);

// Rejestrowanie endpointów dla użytkowników
// Ścieżka do routingu użytkowników
app.use("/user", userRoutes); 

// Funkcja ładująca sekrety z docker secrets
function loadSecret(filePath, defaultValue = null) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch (err) {
    console.warn(`⚠️ User service -  Nie udało się odczytać sekret z ${filePath}. Używana domyślna wartość.`);
    return defaultValue;
  }
}

// Załaduj sekrety JWT i konfigurację bazy danych
const JWT_SECRET = loadSecret("/run/secrets/jwt_secret", process.env.JWT_SECRET_FILE);
const JWT_REFRESH_SECRET = loadSecret("/run/secrets/jwt_refresh_secret", process.env.JWT_REFRESH_SECRET_FILE);
const DATABASE_URL = loadSecret("/run/secrets/db_url_secret", process.env.DATABASE_URL_FILE);

if (!JWT_SECRET || !JWT_REFRESH_SECRET || !DATABASE_URL) {
  console.error("❌ User service - Brak wymaganych sekretów JWT lub konfiguracji bazy danych.");
  process.exit(1);
} else {
  console.log("✅ User-service - Wszystkie sekrety prawidłowe.");
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
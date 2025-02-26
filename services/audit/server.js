const express = require("express");
// Niezbędne, aby nie pokazywało na FE błędów z CORS not allowed
const cors = require("cors");
const bodyParser = require("body-parser");
// Import konfiguracji Sequelize
const { sequelize } = require("./config/database");
// Import RabbitMQ
const { connectRabbitMQ } = require('./config/rabbitmq');
// klient Prometheus + Grafana
const client = require('prom-client');
// Import funkcji zapisu logów do pliku
const logger = require('./config/logger');
// Obsługa Docker Secrets
const fs = require("fs");
// Importy dla swagger docs
const swaggerUi = require("swagger-ui-express");
// Importujemy YAML
const YAML = require("yamljs"); 
// Import endpointów serwisu
const auditRoutes = require("./api");

// Import niestandardowych metryk prometheus z config/metrics.js
const { 
  register,
  httpRequestCounter,
  responseTimeHistogram,
  activeRequestsGauge,
  errorCounter
} = require('./config/metrics');

const app = express();
app.use(cors())

// Rejestrowanie logów do pliku
app.use((req, res, next) => {
  logger.info(`Request received: ${req.method} ${req.url}`);
  next();
});

// Parsowanie JSON w żądaniach
app.use(bodyParser.json());

// Wywołanie funkcji do połączenia z RabbitMQ
connectRabbitMQ();

// Rejestr metryk Prometheus + Grafana
client.collectDefaultMetrics({ register });

// Endpoint /metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware rejestrujący metryki HTTP - prometheus
app.use((req, res, next) => {
  activeRequestsGauge.inc(); // Zwiększ licznik aktywnych żądań
  const end = responseTimeHistogram.startTimer(); // Rozpocznij mierzenie czasu odpowiedzi

  res.on('finish', () => {
    activeRequestsGauge.dec(); // Zmniejsz licznik aktywnych żądań
    end({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode
    });

    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode
    });
  });

  next();
});

// Middleware obsługi błędów - prometheus
app.use((err, req, res, next) => {
  errorCounter.inc({ type: err.name || 'UnknownError' }); // Zarejestruj typ błędu
  next(err);
});

// Wczytanie pliku Swagger (swagger.yaml)
const swaggerDocument = YAML.load('./swagger.yaml');

// Ustawienie Swagger UI na /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Pobieranie portu z pliku .env lub ustawienie domyślnego
const PORT = 4002;

// Debugowanie portu
console.log(`🚀 Uruchamiam serwis na porcie ${PORT}`);

// Rejestrowanie endpointów dla użytkowników
// Ścieżka do routingu użytkowników
app.use("/audit", auditRoutes); 

// Funkcja ładująca sekrety z docker secrets
function loadSecret(filePath, defaultValue = null) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch (err) {
    console.warn(`⚠️ Audit service -  Nie udało się odczytać sekret z ${filePath}. Używana domyślna wartość.`);
    return defaultValue;
  }
}

// Załaduj sekrety JWT i konfigurację bazy danych
const JWT_SECRET = loadSecret("/run/secrets/jwt_secret", process.env.JWT_SECRET_FILE);
const JWT_REFRESH_SECRET = loadSecret("/run/secrets/jwt_refresh_secret", process.env.JWT_REFRESH_SECRET_FILE);
const DATABASE_URL = loadSecret("/run/secrets/db_url_secret", process.env.DATABASE_URL_FILE);

if (!JWT_SECRET || !JWT_REFRESH_SECRET || !DATABASE_URL) {
  console.error("❌ Audit service - Brak wymaganych sekretów JWT lub konfiguracji bazy danych.");
  process.exit(1);
} else {
  console.log("✅ Audit-service - Wszystkie sekrety prawidłowe.");
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  logger.info(`Audit service running on http://localhost:${PORT}`);
});
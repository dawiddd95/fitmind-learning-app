const fs = require("fs");
const Redis = require("ioredis");

// Wczytanie danych z plików sekretnych
// wartości process.env.REDIS_HOST_FILE
// Biorą się one z docker-compose z environment np:
// REDIS_HOST_FILE: /run/secrets/redis_host_secret
// REDIS_PORT_FILE: /run/secrets/redis_port_secret
// JWT_SECRET_FILE: /run/secrets/jwt_secret
const redisHost = fs.readFileSync(process.env.REDIS_HOST_FILE, "utf8").trim();
const redisPort = fs.readFileSync(process.env.REDIS_PORT_FILE, "utf8").trim();

// Konfiguracja Redis
const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
});

// Sprawdzanie połączenia z Redis
redisClient.on('connect', () => {
  console.log('✅ Auth service - Połączono z Redis na host:', redisHost, 'port:', redisPort);
});

redisClient.on("error", (err) => { 
  console.error("Auth service - ❌ Błąd połączenia z Redis:", err);
});

// Eksport klienta Redis do użycia w innych plikach
module.exports = redisClient;
// Import modułu fs (File System) do pracy z plikami
const fs = require('fs');

// Import modułu path do pracy ze ścieżkami plików i katalogów
const path = require('path');

// Definiowanie ścieżki do katalogu logów
const logDir = path.join(__dirname, 'logs');

// Sprawdzanie, czy katalog logów istnieje
if (!fs.existsSync(logDir)) {
  // Tworzenie katalogu logów, jeśli nie istnieje
  fs.mkdirSync(logDir);
}

// Definiowanie ścieżki do pliku logów w katalogu logs
const logFile = path.join(logDir, 'app.log');

// Funkcja do zapisywania logów do pliku
function logToFile(level, message) {
  // Pobieranie aktualnego czasu w formacie ISO 8601
  const timestamp = new Date().toISOString();

  // Tworzenie wiadomości logu w formacie "[czas] [priorytet] wiadomość"
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  // Dodawanie wiadomości logu na końcu pliku logów
  fs.appendFileSync(logFile, logMessage, 'utf8');
}

// Eksport funkcji logowania z priorytetami INFO, WARN, ERROR
module.exports = {
  // Funkcja logująca informacje (INFO)
  info: (message) => logToFile('INFO', message),

  // Funkcja logująca ostrzeżenia (WARN)
  warn: (message) => logToFile('WARN', message),

  // Funkcja logująca błędy (ERROR)
  error: (message) => logToFile('ERROR', message),
};

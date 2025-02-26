// Importuje bibliotekę amqplib do obsługi RabbitMQ
const amqp = require("amqplib");
const fs = require('fs');
const path = require('path');
// Import funkcji zapisu do ElasticSearch
const { logToElastic } = require('./elasticsearch');

// Funkcja do odczytu sekretów z plików
// Będziemy odczytywać te pliki z environment z docker-compose
// environment:
// # Domyślny użytkownik administracyjny RabbitMQ
// RABBITMQ_USER_FILE: /run/secrets/rabbitmq_user_secret
// # Hasło dla domyślnego użytkownika
// RABBITMQ_PASS_FILE: /run/secrets/rabbitmq_password_secret
function readSecret(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8').trim();
  } catch (error) {
    console.error(`Błąd odczytu sekretu z pliku ${filePath}:`, error);
    return null;
  }
}

// Zmienna globalna dla połączenia i kanału RabbitMQ
let channel;

// Funkcja do nawiązywania połączenia z RabbitMQ
async function connectRabbitMQ() {
  try {
    // Odczytujemy użytkownika i hasło z plików wskazanych przez zmienne środowiskowe
    // czyli z 
    // environment:
    // # Domyślny użytkownik administracyjny RabbitMQ
    // RABBITMQ_USER_FILE: /run/secrets/rabbitmq_user_secret
    // # Hasło dla domyślnego użytkownika
    // RABBITMQ_PASS_FILE: /run/secrets/rabbitmq_password_secret
    const rabbitUser = readSecret(process.env.RABBITMQ_USER_FILE);
    const rabbitPass = readSecret(process.env.RABBITMQ_PASS_FILE);

    if (!rabbitUser || !rabbitPass) {
      throw new Error('Nie udało się odczytać użytkownika lub hasła RabbitMQ');
    }

    console.log('RabbitMQ is starting')

    // Nawiązujemy połączenie z serwerem RabbitMQ
    const connection = await amqp.connect(`amqp://guest:guest@rabbitmq:5672`);

    // Tworzymy kanał komunikacyjny RabbitMQ
    channel = await connection.createChannel();

    // Definiujemy nazwę kolejki, do której będą trafiały wiadomości
    const queue = 'audit_logs';

    // Upewnia się że kolejka istnieje 
    // lub jeśli nie istnieje to ją tworzy 
    // durable: true oznacza trwałość kolejki RabbitMQ nawet po restarcie RabbitMQ
    await channel.assertQueue(queue, { durable: true });

    console.log(`Waiting for messages in queue: ${queue}`);

    // Ustawia funkcję do przetwarzania wiadomości z kolejki
    // Ten konsumer się wykonuje za każdym razem jak dodamy coś do kolejki metodą 
    // channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    channel.consume(queue, async (msg) => {
      if (msg) {
        // Parsuje wiadomość z formatu JSON na obiekt JavaScript
        const log = JSON.parse(msg.content.toString());

        // Wyświetla odebraną wiadomość w konsoli
        console.log('Received log:', log);

        // Zapis loga z audit-service do ElasticSearch
        // Funkcja może być używana w różnych częściach aplikacji
        // Zapisuje logi do ElasticSearch – służy do szybkiego przeszukiwania i analizy logów, np. w Kibanie.
        await logToElastic(log);

        // Nie zapisujemy tutaj logów do bazy danych bo stworzy nam nieskończoną pętlę
        // await auditService.createAuditLog(log);

        // Potwierdza, że wiadomość została przetworzona (ACK - Acknowledge)
        channel.ack(msg);
      }
    });
  } catch (error) {
    // Loguje błąd w przypadku problemu z połączeniem z RabbitMQ
    console.error('RabbitMQ connection error:', error);

    // Ponawiamy próbę połączenia
    // RabbitMQ czasami potrzebuje kilkanaście sekund by załadować wszystkie pluginy
    // Za którymś razem połączenie powinno zakończyć się pomyślnie
    setTimeout(function() {
      connectRabbitMQ();
    }, 10000)
  }
}

// Funkcja dodawania wiadomości do kolejki RabbitMQ
async function addToQue(queue, message) {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not initialized. Call connectRabbitMQ first.");
    }

    // Publikowanie wiadomości w kolejce
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    console.log(`Message sent to queue "${queue}":`, message);
  } catch (error) {
    console.error(`Failed to send message to queue "${queue}":`, error.message);
  }
}

module.exports = { connectRabbitMQ, addToQue };

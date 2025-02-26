const { Client } = require('@elastic/elasticsearch');

// Tworzymy instancję klienta ElasticSearch
const esClient = new Client({
    // nazwa usługi z docker-compose oraz port z docker-compose
    node: 'http://elasticsearch:9200' 
});

// Funkcja do zapisywania logów w ElasticSearch
async function logToElastic(logData) {
  try {
    // Próba zapisania dokumentu w określonym indeksie
    const response = await esClient.index({
      index: 'audit_logs', // Nazwa indeksu w ElasticSearch
      document: logData, // Dane logu do zapisania
    });

    // Wyświetla informację o zapisanym logu
    console.log('Log zapisany w ElasticSearch:', response);
  } catch (error) {
    // Loguje błąd w przypadku problemów z zapisaniem logu
    console.error('Błąd zapisu do ElasticSearch:', error);
  }
}

module.exports = {
    logToElastic
};
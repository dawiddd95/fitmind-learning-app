const client = require('prom-client');

// Rejestr globalny dla Prometheus
const register = new client.Registry();



// --------------------- Metryki HTTP ----------------------

// Metryka dla liczby żądań HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestCounter);

// Metryka dla czasu odpowiedzi latency
const responseTimeHistogram = new client.Histogram({
  name: 'http_response_time_seconds',
  help: 'HTTP response time in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});
register.registerMetric(responseTimeHistogram);

// Metryka dla aktywnych żądań HTTP
const activeRequestsGauge = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests'
});
register.registerMetric(activeRequestsGauge);



// --------------------- Metryki aplikacji ----------------------

// Metryka dla liczby błędów aplikacji
const errorCounter = new client.Counter({
  name: 'app_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type']
});
register.registerMetric(errorCounter);

// Metryka dla operacji na bazie danych
const dbOperationsCounter = new client.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'table']
});
register.registerMetric(dbOperationsCounter);



// --------------------- Metryki zasobów ----------------------

// Metryka dla zużycia pamięci
const memoryUsageGauge = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});
register.registerMetric(memoryUsageGauge);

// Metryka dla zużycia CPU
const cpuUsageGauge = new client.Gauge({
  name: 'cpu_usage_seconds',
  help: 'CPU usage in seconds',
  labelNames: ['type']
});
register.registerMetric(cpuUsageGauge);



// --------------------- Metryki RabbitMQ ----------------------

// RabbitMQ: liczba przetworzonych wiadomości
const rabbitMqMessagesCounter = new client.Counter({
  name: 'rabbitmq_messages_processed_total',
  help: 'Total number of RabbitMQ messages processed',
  labelNames: ['queue']
});
register.registerMetric(rabbitMqMessagesCounter);



// --------------------- Aktualizacje metryk zasobów ----------------------
setInterval(() => {
  // Aktualizacja zużycia pamięci
  const memoryUsage = process.memoryUsage();
  memoryUsageGauge.set({ type: 'rss' }, memoryUsage.rss);
  memoryUsageGauge.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
  memoryUsageGauge.set({ type: 'heapUsed' }, memoryUsage.heapUsed);

  // Aktualizacja zużycia CPU
  const cpuUsage = process.cpuUsage();
  cpuUsageGauge.set({ type: 'user' }, cpuUsage.user / 1e6); // Konwersja na sekundy
  cpuUsageGauge.set({ type: 'system' }, cpuUsage.system / 1e6);
}, 5000); // Aktualizuj co 5 sekund


module.exports = {
  register,
  httpRequestCounter,
  responseTimeHistogram,
  activeRequestsGauge,
  errorCounter,
  dbOperationsCounter,
  rabbitMqMessagesCounter
};

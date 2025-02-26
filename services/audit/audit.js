// Importujemy nasz model audit
const Audit = require('./models/audit');
// Importuje operator Sequelize, który umożliwia zaawansowane zapytania (np. porównania dat)
const { fn, Op } = require('sequelize');
// Import metody do dodawania do kolejki RabbitMQ
const { addToQue } = require('./config/rabbitmq');

// Tworzy pojedynczy log audytowy
async function createAuditLog(data) {
    // Tworzy nowy wpis w tabeli Audit z przekazanymi danymi
    const log = await Audit.create(data);

    // Dodaje log do kolejki RabbitMQ
    // log Zwraca obiekt z dataValues: {nasze pola}, 
    // więc żeby przeszła walidacja musimy jeszcze wejść w dataValues 
    // wtedy zostaną przekazane odrazu nasze pola, zamiast być opakowane w dataValues:
    await addToQue('audit_logs', log.dataValues);

    // Zwraca utworzony log
    return log;
}

// Tworzy wiele logów jednocześnie (Bulk)
async function createBatchLogs(logs) {
    try {
        // Tworzy wiele wpisów w tabeli Audit naraz, korzystając z bulkCreate
        const createdLogs = await Audit.bulkCreate(logs);

        // Iteruje przez każdy log i dodaje go do kolejki RabbitMQ
        for (const log of createdLogs) {
            await addToQue('audit_logs', log);
        }

        // Zwraca tablicę utworzonych logów
        return createdLogs;
    } catch (err) {
        // Rzuca błąd z opisem, jeśli coś poszło nie tak
        throw new Error(`Error creating batch logs: ${err.message}`);
    }
}

// Pobiera logi z opcjonalnym filtrowaniem
async function getAuditLogs(filters) {
    try {
        // Destrukturyzuje dostępne filtry z parametru filters
        const {
            // Typ zdarzenia np: LOGIN, LOGOUT
            eventType,    
            // Kto wykonał akcję - email usera
            performedBy,   
            // Nazwa serwisu np: auth-service 
            service,   
            // Poziom tego jak ważny to komunikat - INFO, WARNING, ERROR  
            severity,     
            // Status operacji - SUCCESS, FAILURE  
            status,     
            // Od jakiej daty mamy filtrować   
            startDate,  
            // Do jakiej daty filtrować  
            endDate,        
        } = filters;

        // Tworzy pusty obiekt where, który będzie używany do budowy zapytania
        // WHERE warunek zapytania SQL
        const where = {};

        // Dodaje warunek filtrowania po typie zdarzenia, jeśli został podany
        if (eventType) where.eventType = eventType;
        // Dodaje warunek filtrowania kto wykonał akcję, jeśli został podany
        if (performedBy) where.performedBy = performedBy;
        // Dodaje warunek filtrowania po nazwie serwisu, jeśli został podany
        if (service) where.service = service;
        // Dodaje warunek filtrowania po poziomie jak ważny jest komunikat, jeśli został podany
        if (severity) where.severity = severity;
        // Dodaje warunek filtrowania po statusie operacji, jeśli został podany
        if (status) where.status = status;

        // Dodaje warunki filtrowania po zakresie dat, jeśli zostały podane
        if (startDate || endDate) {
            where.timestamp = {};
            // Dodaje warunek, że timestamp musi być większy lub równy startDate
            if (startDate) where.timestamp[Op.gte] = new Date(startDate);
            // Dodaje warunek, że timestamp musi być mniejszy lub równy endDate
            if (endDate) where.timestamp[Op.lte] = new Date(endDate);
        }

        // Pobiera logi z tabeli Audit zgodnie z warunkami where
        const logs = await Audit.findAll({ where });
        // Zwraca pobrane logi
        return logs;
    } catch (err) {
        // Rzuca błąd z opisem, jeśli coś poszło nie tak
        throw new Error(`Error retrieving audit logs: ${err.message}`);
    }
}

// Pobiera szczegółowy log na podstawie ID
async function getAuditLogById(id) {
    try {
        // Wyszukuje log w tabeli Audit na podstawie klucza głównego (ID)
        const log = await Audit.findByPk(id);
        // Jeśli log nie istnieje, rzuca błąd
        if (!log) throw new Error('Audit log not found');
        // Zwraca znaleziony log
        return log;
    } catch (err) {
        // Rzuca błąd z opisem, jeśli coś poszło nie tak
        throw new Error(`Error retrieving audit log by ID: ${err.message}`);
    }
}

// Usuwa logi starsze niż określona data lub spełniające inne kryteria
async function deleteOldLogs(filters) {
    try {
        // Destrukturyzuje parametr olderThan z filtru
        const { olderThan } = filters;

        // Jeśli olderThan nie został podany, rzuca błąd
        if (!olderThan) {
            throw new Error('Parameter "olderThan" is required for deletion');
        }

        // Konwertuje olderThan na obiekt daty
        const dateThreshold = new Date(olderThan);

        // Usuwa logi, które mają timestamp starszy niż dateThreshold
        const deletedCount = await Audit.destroy({
            where: {
                timestamp: {
                    [Op.lt]: dateThreshold,
                },
            },
        });

        // Zwraca liczbę usuniętych logów
        return deletedCount;
    } catch (err) {
        // Rzuca błąd z opisem, jeśli coś poszło nie tak
        throw new Error(`Error deleting old logs: ${err.message}`);
    }
}

// Eksportuje logi w formacie CSV lub JSON
async function exportLogs(filters) {
    try {
        // Pobiera logi zgodnie z podanymi filtrami
        const logs = await getAuditLogs(filters);

        // Ustawia format eksportu; domyślnie JSON
        const format = filters.format || 'json';

        // Jeśli format to CSV, konwertuje logi na format CSV
        if (format === 'csv') {
            // Tworzy nagłówki CSV na podstawie pól modelu Audit
            const csvHeaders = Object.keys(Audit.rawAttributes).join(',');
            // Tworzy wiersze CSV na podstawie wartości w logach
            const csvRows = logs.map(log =>
                Object.values(log.dataValues).join(',')
            );
            // Zwraca nagłówki i wiersze jako ciąg tekstowy CSV
            return [csvHeaders, ...csvRows].join('\n');
        }

        // W przypadku JSON, zwraca logi jako sformatowany JSON
        return JSON.stringify(logs, null, 2);
    } catch (err) {
        // Rzuca błąd z opisem, jeśli coś poszło nie tak
        throw new Error(`Error exporting logs: ${err.message}`);
    }
}

// Pobiera statystyki logów np: liczba logów według typów zdarzeń
async function getAuditStats() {
    try {
        // Liczy wszystkie logi w tabeli Audit
        const totalLogs = await Audit.count();
        // Grupuje logi według eventType i liczy ich wystąpienia
        const logsByEventType = await Audit.findAll({
            attributes: ['eventType', [fn('COUNT', 'eventType'), 'count']],
            group: 'eventType',
        });
        // Grupuje logi według service i liczy ich wystąpienia
        const logsByService = await Audit.findAll({
            attributes: ['service', [fn('COUNT', 'service'), 'count']],
            group: 'service',
        });

        // Zwraca statystyki logów w obiekcie
        return {
            totalLogs,
            logsByEventType,
            logsByService,
        };
    } catch (err) {
        // Rzuca błąd z opisem, jeśli coś poszło nie tak
        throw new Error(`Error retrieving audit stats: ${err.message}`);
    }
}

// Eksportuje wszystkie funkcje jako moduł
module.exports = {
    createAuditLog,
    createBatchLogs,
    getAuditLogs,
    getAuditLogById,
    deleteOldLogs,
    exportLogs,
    getAuditStats,
};

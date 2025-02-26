const express = require('express');

// Importuje moduł logiki audytowej, który zawiera funkcje do zarządzania logami audytu
const auditService = require('./audit');

const router = express.Router();

// tworzenie pojedynczego logu audytowego
router.post('/logs', async (req, res) => {
    try {
        const log = await auditService.createAuditLog(req.body);
        // Zwraca utworzony log z kodem statusu 201 (Created)
        res.status(201).json(log);
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 400 (Bad Request) z komunikatem błędu
        res.status(400).json({ error: err.message });
    }
});

// tworzenie wielu logów jednocześnie
router.post('/logs/batch', async (req, res) => {
    try {
        const logs = await auditService.createBatchLogs(req.body);
        // Zwraca utworzone logi z kodem statusu 201 (Created)
        res.status(201).json(logs);
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 400 (Bad Request) z komunikatem błędu
        res.status(400).json({ error: err.message });
    }
});

// pobieranie statystyk logów
router.get('/logs/stats', async (req, res) => {
    try {
        const stats = await auditService.getAuditStats();
        // Zwraca statystyki logów i kod statusu 200 (OK)
        res.status(200).json(stats);
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 500 (Internal Server Error) z komunikatem błędu
        res.status(500).json({ error: err.message });
    }
});

// eksportowanie logów w formacie CSV lub JSON
router.get('/logs/export', async (req, res) => {
    try {
        const data = await auditService.exportLogs(req.query);
        // Ustawia nagłówki odpowiedzi, aby wymusić pobranie pliku
        res.setHeader('Content-Disposition', `attachment; filename="logs.${req.query.format || 'json'}"`);
        // Wysyła dane logów jako odpowiedź
        res.send(data);
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 500 (Internal Server Error) z komunikatem błędu
        res.status(500).json({ error: err.message });
    }
});


// pobieranie logów z opcjonalnym filtrowaniem
router.get('/logs', async (req, res) => {
    try {
        const logs = await auditService.getAuditLogs(req.query);
        // Zwraca pobrane logi z kodem statusu 200 (OK)
        res.status(200).json(logs);
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 500 (Internal Server Error) z komunikatem błędu
        res.status(500).json({ error: err.message });
    }
});

// usuwanie logów według podanych kryteriów, np. starsze niż określona data 90dni
router.delete('/logs', async (req, res) => {
    try {
        const deletedCount = await auditService.deleteOldLogs(req.query);
        // Zwraca liczbę usuniętych logów i kod statusu 200 (OK)
        res.status(200).json({ message: `${deletedCount} logs deleted` });
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 500 (Internal Server Error) z komunikatem błędu
        res.status(500).json({ error: err.message });
    }
});

// pobieranie szczegółów o logu na podstawie jego ID
// NIECH /logs/:id jest na końcu by endpointów jak /logs/stats nie brało, że stats to niby id logu
router.get('/logs/:id', async (req, res) => {
    try {
        const log = await auditService.getAuditLogById(req.params.id);
        // Zwraca szczegółowy log z kodem statusu 200 (OK)
        res.status(200).json(log);
    } catch (err) {
        // W przypadku błędu zwraca kod statusu 404 (Not Found) z komunikatem błędu
        res.status(404).json({ error: err.message });
    }
});

// Endpoint do testowania czy serwis działa
router.get("/test", async (req, res) => {
    res.json({ message: 'Audit service is running!' });
});

// Eksportuje router, aby mógł być używany w głównej aplikacji
module.exports = router;

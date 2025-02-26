const express = require('express');
// Importuje logikę serwisu
const userService = require('./user'); 
// Import middleware do weryfikacji tokena
const { authenticate } = require("./middleware/authenticate"); 
const { userVerify } = require("./middleware/userVerify");
const router = express.Router();

// Endpoint do pobrania użytkownika po ID
router.get('/users/:id', authenticate, userVerify, async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).json(user);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// Endpoint do znajdowania użytkownika po e-mailu
router.get('/users/email/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const user = await userService.getUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Endpoint do tworzenia nowego użytkownika
router.post('/users', async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Endpoint do aktualizacji danych użytkownika
router.patch('/users/:id', authenticate, userVerify, async (req, res) => {
    try {
        const updatedUser = await userService.updateUserById(req.params.id, req.body);
        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// Endpoint do usuwania użytkownika
router.delete('/users/:id', authenticate, userVerify, async (req, res) => {
    try {
        await userService.deleteUserById(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// Endpoint do testowania czy serwis działa
router.get("/test", async (req, res) => {
    res.json({ message: 'User service is running!' });
});

module.exports = router;

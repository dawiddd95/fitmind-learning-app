// Plik api.js to pierwsze miejsce gdzie dzieją się operacje na BE po wykonaniu zapytania przez FE
// W tym pliku wywoływana jest logika z auth.js 

const express = require("express");
// Import routera express ja do tworzenia endpointów
const router = express.Router();
// Importujemy logikę z pliku auth.js, który jest naszą logiką biznesową tego mikreoserwisu
const { register, login, refreshTokens, authenticate, logout } = require("./auth"); 

// Rejestracja usera
router.post("/register", async (req, res) => {
    // z body naszego żądania pobieramy email i hasło podane w formularzu rejestracji
    const { email, password } = req.body;

    try {
        // Wykonujemy metodę z auth.js czyli naszej logiki biznesowej tego mikroserwisu
        await register(email, password);
        // Jeśli wszystko jest okej
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        // Jeśli coś poszło nie tak
        res.status(400).json({ message: err.message });
    }
});

// Logowanie usera
router.post("/login", async (req, res) => {
    // z body naszego żądania pobieramy email i hasło podane w formularzu logowania
    const { email, password } = req.body;
    try {
        // Wykonujemy metodę z auth.js czyli naszej logiki biznesowej tego mikroserwisu
        const tokens = await login(email, password);
        // Zwracamy tokeny - access token i refresh token jeśli wszystko poszło pomyślnie
        res.json(tokens);
    } catch (err) {
        // Jeśli coś poszło nie tak zwracamy error
        res.status(400).json({ message: err.message });
    }
});

// Odświeżanie tokenów - access token i refresh token
// Nie ma tutaj middleware authenticate, ponieważ używamy refresh token do generowania nowego access token
// authneticate sprawia, że musimy podać jeszcze access token do wykonania żądania, ale access token jest już nieaktywny
// więc żądanie nie przejdzie
router.post("/refresh-token", async (req, res) => {
    // Pobieranie refresh token z ciała żądania
    const { refreshToken } = req.body; 
  
    try {
        // Wywołanie funkcji odświeżania z auth.js czyli naszej logiki biznesowej tego mikroserwisu
        const tokens = await refreshTokens(refreshToken);
        // Jeśli wszystko okej to zwracamy nowy refresh token i access token
        res.json(tokens);
    } catch (err) {
        // Jeśli coś poszło nie tak zwracamy 401 Unauthorized
        res.status(401).json({ message: err.message });
    }
});
  
  // Wylogowanie użytkownika
router.post("/logout", authenticate, async (req, res) => {
    try {
        // Wywołanie funkcji wylogowania z auth.js
        await logout(req.user.sub);
        // Jeśli wylogowanie przebiegnie pomyślnie, zwracamy status 200
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        // W przypadku błędu zwracamy status 500 oraz opis błędu
        res.status(500).json({ message: "Error during logout" });
    }
});

// Endpoint do weryfikacji tokena dla innych serwisów niż auth-service
router.post("/verify-token", authenticate, (req, res) => {
    // Zwraca zweryfikowane dane użytkownika
    res.json({ user: req.user }); 
});

// Endpoint do sprawdzania statusu sesji
router.get("/session", authenticate, async (req, res) => {
    try {
        // session:<id usera>:access to klucz w redis do zwracania access token
        // do refresh token natomiast jest klucz session:<id usera>:refresh
        // Cała fraza to klucz nie tylko access czy refresh
        const accessToken = await redis.get(`session:${req.user.sub}:access`);

        if (!accessToken) {
            return res.status(401).json({ message: "Session expired" });
        }

        res.status(200).json({ message: "Session active", user: req.user });
    } catch (err) {
        res.status(500).json({ message: "Error checking session" });
    }
});

// Endpoint: Endpoint chroniony
router.get("/protected", authenticate, (req, res) => {
    res.json({ message: `Welcome, ${req.user.email}` });
});

router.get("/test", async (req, res) => {
    res.json({ message: 'Auth service is running! version 10.01.2025 v8' });
});

module.exports = router;

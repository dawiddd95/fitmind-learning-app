const axios = require("axios");

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // Wywołanie HTTP do auth-service na endpoint /verify-token
        // Tutaj nie podajemy localhost:4000
        // W mikroserwisach podajemy nazwę mikroserwisu:port np:
        // auth-service:4001
        // dalej jest /auth/verify-token bo:
        // 1. Mamy kod app.use("/auth", authRoutes);  w auth-service co oznacza, że mamy prefiks auth
        // 2. Natomiast dalsza część /verify-token to już nasz endpoint
        const response = await axios.post("http://auth-service:4000/auth/verify-token", null, {
            headers: { Authorization: `Bearer ${token}` },
        });

        // Przypisanie danych użytkownika do req.user
        req.user = response.data.user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};

module.exports = { authenticate };

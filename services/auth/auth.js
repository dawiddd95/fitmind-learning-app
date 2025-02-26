// Tutaj mamy logikę naszego serwisu auth - logowanie, rejestrację oraz middleware do weryfikacji tokenów JWT

const axios = require("axios");
// Do hashowania haseł
const bcrypt = require("bcrypt"); 
// Do generowania i weryfikacji JWT
const jwt = require("jsonwebtoken"); 
// Połączenie z bazą danych PostgreSQL
const { pool } = require("./config/database"); 
// Połączenie z Redis
const redis = require("./config/redis"); 
// Do odczytywania sekretów z docker
const fs = require("fs");

// Ścieżki do plików Docker Secrets
const jwtSecretPath = process.env.JWT_SECRET_FILE;
const jwtRefreshSecretPath = process.env.JWT_REFRESH_SECRET_FILE;

// Sprawdzanie, czy pliki z sekretem istnieją
if (!fs.existsSync(jwtSecretPath) || !fs.existsSync(jwtRefreshSecretPath)) {
    throw new Error("JWT secret files not found. Ensure the secrets are configured correctly.");
}
  
// Odczyt zawartości plików sekretnych
const JWT_SECRET = fs.readFileSync(jwtSecretPath, "utf8").trim();
const JWT_REFRESH_SECRET = fs.readFileSync(jwtRefreshSecretPath, "utf8").trim();

// Rejestracja użytkownika
const register = async (email, password) => {
    try {
        let userExists = false;

        // Ten try catch jest ponieważ linia kodu
        // const response = await axios.get(`http://user-service:4001/user/users/email/${email}`);
        // Zwróci 404 jeśli takiego usera nie ma i wtedy kod ma iść dalej, bez tego try catch przy tej 404 przejdzie do catch odrazu
        try {
            // Sprawdzenie, czy użytkownik już istnieje w user-service
            // Komunikacja serwisu auth-service z user-service
            // Tak właśnie powinna wyglądać komunikacja między serwisami
            // Za pomocą żądań HTTP
            // Tutaj nie podajemy localhost:4001
            // W mikroserwisach podajemy nazwę mikroserwisu:port np:
            // user-service:4001
            // dalej jest user/users/email/${email} bo:
            // 1. Mamy kod app.use("/user", userRoutes);  w user-service co oznacza, że mamy prefiks user
            // 2. Natomiast dalsza część /users/email/:email to już nasz endpoint
            userExists = await axios.get(`http://user-service:4001/user/users/email/${email}`);
        } catch (err) {
            // Jeśli endpoint zwraca 404, to kontynuujemy
            if (err.response && err.response.status === 404) {
                userExists = false;
            } else {
                // W przypadku innych błędów (np. 500) rzucamy wyjątek
                throw new Error("Error checking user existence: " + err.message);
            }
        }
        
        // Jeśli użytkownik już istnieje w bazie danych
        if (userExists) {
            throw new Error("User already exists");
        }
    
        // Jeśli użytkownik nie istnieje, hashujemy hasło
        // Hashowanie hasła za pomocą bcrypt
        // 10 oznacza, że algorytm hashowania wykona 2^10 iteracji (1024)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Wysyłanie żądania do user-service, aby stworzyć użytkownika
        // Tutaj nie podajemy localhost:4001
        // W mikroserwisach podajemy nazwę mikroserwisu:port np:
        // user-service:4001
        // dalej jest user/users/ bo:
        // 1. Mamy kod app.use("/user", userRoutes);  w user-service co oznacza, że mamy prefiks user
        // 2. Natomiast dalsza część /users to już nasz endpoint
        const response = await axios.post("http://user-service:4001/user/users", {
            email,
            password: hashedPassword,
        });

        // Zwrócenie odpowiedzi z user-service
        return response.data; 
    } catch (err) {
        // Obsługa błędów podczas komunikacji z user-service
        if (err.response && err.response.status === 404) {
            throw new Error("Error: " + err.message);
        }
        throw new Error("Error creating user: " + err.message);
    }
};

// Logowanie użytkownika
const login = async (email, password) => {
    try {
        // Sprawdzenie użytkownika w user-service
        // Tutaj nie podajemy localhost:4001
        // W mikroserwisach podajemy nazwę mikroserwisu:port np:
        // user-service:4001
        // dalej jest user/users/email/${email} bo:
        // 1. Mamy kod app.use("/user", userRoutes);  w user-service co oznacza, że mamy prefiks user
        // 2. Natomiast dalsza część /users/email/:email to już nasz endpoint
        const response = await axios.get(`http://user-service:4001/user/users/email/${email}`);                            
                                         
        const user = response.data;

        // Jeśli użytkownik o takim emailu nie istnieje to zwracam do frontendu błąd
        if (!user) {
            throw new Error("Invalid credentials"); 
        }
    
        // Weryfikacja hasła przy użyciu bcrypt
        // Bierzemy hasło przesłane jako plain tekst, hashujemy je 1024 razy i porównujemy z hashem
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // Jeśli hasło jest nieprawidłowe, zwracamy błąd
        if (!isPasswordValid) {
            throw new Error("Invalid credentials"); 
        }
    
        // Jeśli wszystko okej przechodzimy dalej

        // Generowanie access token
        // sub w tokenie JWT to standardowe pole oznaczające podmiot (subject), którego dotyczy token i najczęściej daje się do niego id podmiotu
        const accessToken = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

        // Generowanie refresh token
        const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: "14d" });
    
        // Zapis tokenów access i refresh w Redis
        // Access token na 1 godzinę
        await redis.set(`session:${user.id}:access`, accessToken, "EX", 3600); 
        // Refresh token na 14 dni
        await redis.set(`session:${user.id}:refresh`, refreshToken, "EX", 1209600); 
    
        // Zwracamy wygenerowane tokeny JWT
        return { accessToken, refreshToken };
    } catch (err) {
        throw new Error("Login error: " + err.message);
    }
};

// Odświeżanie tokenów (refresh token)
// Dzieje się to kiedy jesteśmy zalogowani do aplikacji, wykonujemy w niej zapytanie do bazy danych o coś, 
// ale access token nam wygasł w trakcie tej sesji
// FLOW:
// -----------
// 1. Gdy Access Token wygaśnie, klient wysyła żądanie POST /refresh z Refresh Token. 
// Aplikacja frontendowa powinna być w stanie sama samodzielnie rozpoznać, 
// kiedy Access Token wygasł, i automatycznie odświeżyć tokeny, zanim użytkownik to zauważy.
//      1.1. Frontend przechowuje informacje o czasie wygaśnięcia Access Token, np. w momencie logowania lub odświeżenia tokenu:
//           Access Token jest ważny 1 godzinę.
//           W momencie otrzymania tokenu frontend zapisuje expiresAt (czas wygaśnięcia).
//      1.2. Zanim token wygaśnie, aplikacja automatycznie wysyła żądanie odświeżenia tokenów:
//           Może to być zrealizowane np. w interceptorze (np. w Axios, Fetch API) 
//           lub w funkcji obsługującej zapytania API.
//           Jeśli zapytanie do API backendu zwróci błąd 401 (Unauthorized), 
//           frontend automatycznie wyśle żądanie POST /refresh i ponowi pierwotne żądanie.
// 2. Serwer:
//      2.1. Weryfikuje Refresh Token (jwt.verify).
//      2.2. Sprawdza w Redis, czy Refresh Token jest aktywny.
//      2.3. Jeśli token jest ważny:
//          2.3.1. Generuje nowy Access Token i Refresh Token.
//          2.3.2. Zastępuje stare tokeny w Redis.
//          2.3.3. Zwraca nowe tokeny do klienta.
//      2.4. Jeśli Refresh Token wygasł lub jest nieprawidłowy, serwer zwraca błąd 401.
const refreshTokens = async (refreshToken) => {
    try {
        // Weryfikacja poprawności Refresh Token za pomocą klucza tajnego
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        // Pobranie Refresh Token z Redis na podstawie identyfikatora użytkownika
        const storedRefreshToken = await redis.get(`session:${decoded.sub}:refresh`);
  
        // Sprawdzenie zgodności refresh tokenu z tym zapisanym w Redis
        // Rzucenie błędu, jeśli Refresh Token jest niezgodny
        if (refreshToken !== storedRefreshToken) {
            throw new Error("Invalid refresh token");
        }
  
        // Generowanie nowych tokenów jeśli wszystko jest okej
        // Jak odświeżamy token to naturalnie musimy podać nowy token i też nowy refresh token
        // Który będzie służył do odświeżania tokenu
        // Jeśli refresh token byłby cały czas niezmienny to ktoś może go przechwycić i sobie samemu 
        // Odświeżyć token i się włamać do aplikacji
        // Ustawiamy żywotność tę samą tokenów co przy logowaniu
        const newAccessToken = jwt.sign({ sub: decoded.sub }, JWT_SECRET, { expiresIn: "1h" });
        const newRefreshToken = jwt.sign({ sub: decoded.sub }, JWT_REFRESH_SECRET, { expiresIn: "14d" });
  
        // Aktualizacja tokenów w Redis
        await redis.set(`session:${decoded.sub}:access`, newAccessToken, "EX", 3600);
        await redis.set(`session:${decoded.sub}:refresh`, newRefreshToken, "EX", 1209600);
  
        // Zwracamy z endpointu nowy access token i nowy refresh token
        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (err) {
        throw new Error("Invalid or expired refresh token");
    }
};
  
// Middleware do weryfikacji JWT (access token)
// Jest wywoływany kiedy użytkownik wykonuje żądanie do API, które wymaga weryfikacji tożsamości.
// Jest to osobny mechanizm niż refresh token 
// Jeśli Access Token jest ważny to middleware przepuszcza żądanie dalej.
// 1. Sprawdza, czy użytkownik dostarczył Access Token.
// 2. Weryfikuje ważność Access Token.
// 3. Autoryzuje dostęp do chronionych zasobów (np. API lub stron aplikacji).
// 4. Przechowuje dane użytkownika w żądaniu (req.user), aby inne middleware lub endpointy mogły korzystać z informacji o użytkowniku.
const authenticate = async (req, res, next) => {
    // Pobranie nagłówka autoryzacyjnego z żądania
    // Czyli żądanie z aplikacji musi mieć ten nagłówek, jeśli go nei będzie to żądanie nie przejdzie dalej
    const authHeader = req.headers.authorization;
    
    // Jeśli nagłówek nie istnieje lub jest nieprawidłowy, zwracamy błąd 401
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
  
    // Jeśli nagłówek istnieje i ma token
    // Wyciągnięcie tokenu z nagłówka
    const token = authHeader.split(" ")[1];

    try {
        // Weryfikacja Access Token za pomocą klucza tajnego
        const decoded = jwt.verify(token, JWT_SECRET);
        // Pobranie tokenu z Redis i porównanie go z przesłanym tokenem
        const redisToken = await redis.get(`session:${decoded.sub}:access`);
        
        if (token !== redisToken) {
            return res.status(401).json({ message: "Invalid session" });
        }
      
        // Przechowywanie danych użytkownika w żądaniu
        req.user = decoded;

        // Przejście do następnego middlewareu
        next();
    } catch (err) {
        res.status(401).json({ message: "Unauthorized" });
    }
  };
  
// Automatyczne wylogowanie po 14 dniach braku aktywności
const logout = async (userId) => {
    // Usunięcie Access Token i Refresh Token z Redis
    await redis.del(`session:${userId}:access`);
    await redis.del(`session:${userId}:refresh`);
};
  
module.exports = { register, login, refreshTokens, authenticate, logout };

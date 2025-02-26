const User = require('./models/user');

// Funkcja pobierająca użytkownika po ID
async function getUserById(id) {
    try {
        // Wyszukuje użytkownika w bazie danych po ID
        const user = await User.findByPk(id);
        if (!user) {
            // Jeśli użytkownik nie istnieje, zwraca błąd
            throw new Error('User not found');
        }

        // Wyrzucamy ze zwróconego obiektu user pole password, bo nie chcemy go zwracać
        const { password, ...userWithoutPassword } = user.dataValues;

        // Zwracamy usera, ale bez pola password
        return userWithoutPassword;
    } catch (err) {
        // Rzuca błąd do warstwy wywołującej
        throw new Error(err.message);
    }
}

// Znajdowanie użytkownika po e-mailu
async function getUserByEmail(email) {
    try {
        const user = await User.findOne({ where: { email } });
        return user;
    } catch (err) {
        throw new Error(err.message);
    }
}

// Funkcja tworząca nowego użytkownika
async function createUser(userData) {
    try {
        // Tworzy nowego użytkownika w bazie danych
        const user = await User.create(userData);
        return user;
    } catch (err) {
        // Rzuca błąd do warstwy wywołującej
        throw new Error(err.message);
    }
}

// Funkcja aktualizująca dane użytkownika
async function updateUserById(id, updateData) {
    try {
        // Pobiera użytkownika po ID
        const user = await User.findByPk(id);
        if (!user) {
            // Jeśli użytkownik nie istnieje, zwraca błąd
            throw new Error('User not found');
        }
        // Aktualizuje dane użytkownika
        const updatedUser = await user.update(updateData);

        // Wyrzucamy ze zwróconego obiektu user pole password, bo nie chcemy go zwracać
        const { password, ...userWithoutPassword } = updatedUser.dataValues;

        // Zwracamy usera, ale bez pola password
        return userWithoutPassword;
    } catch (err) {
        // Rzuca błąd do warstwy wywołującej
        throw new Error(err.message);
    }
}

// Funkcja usuwająca użytkownika po ID
async function deleteUserById(id) {
    try {
        // Pobiera użytkownika po ID
        const user = await User.findByPk(id);
        if (!user) {
            // Jeśli użytkownik nie istnieje, zwraca błąd
            throw new Error('User not found');
        }
        // Usuwa użytkownika
        await user.destroy();
    } catch (err) {
        // Rzuca błąd do warstwy wywołującej
        throw new Error(err.message);
    }
}

// Eksport funkcji jako modułu serwisu
module.exports = {
    getUserById,
    createUser,
    updateUserById,
    deleteUserById,
    getUserByEmail
};

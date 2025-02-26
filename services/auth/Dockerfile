# Użycie oficjalnego obrazu Node.js jako bazowego
FROM node:18

# Ustawienie katalogu roboczego w kontenerze
WORKDIR /usr/src/app

# Kopiowanie pliku package.json i package-lock.json
COPY package*.json ./

# Instalacja zależności
RUN npm install

# Kopiowanie całego kodu aplikacji do obrazu
COPY . .

# Eksponowanie portu 4000
EXPOSE 4000

# Uruchomienie serwisu
CMD ["node", "server.js"]

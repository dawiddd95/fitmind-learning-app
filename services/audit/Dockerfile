# Użycie oficjalnego obrazu Node.js jako bazowego
FROM node:18

# Ustawienie katalogu roboczego w kontenerze
WORKDIR /usr/src/app

# Kopiowanie package.json i package-lock.json
COPY ./package*.json ./

# Instalacja zależności
RUN npm install

# Kopiowanie całego kodu aplikacji
# Kopiowanie pliku server.js
COPY ../../server.js ./
# Kopiowanie plików mikroserwisu auth
COPY ./ . 

# Eksponowanie portu serwisu
EXPOSE 4002

# Uruchomienie serwisu
CMD ["node", "server.js"]

# 🍣 Sushi Streak App

Un'applicazione mobile cross-platform che permette a gruppi di amici di tenere traccia di chi mangia più sushi durante una cena. Sfida i tuoi amici e scopri chi è il vero campione di sushi!

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-49.0-black.svg)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0-green.svg)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-blueviolet.svg)](https://railway.app/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌐 App Live

- **Backend API**: [http://sushi.dietalab.net](http://sushi.dietalab.net)
- **Status**: ✅ Online e funzionante
- **Piattaforme supportate**: iOS, Android, Web

## 📱 Screenshot e Demo

L'app presenta un'interfaccia moderna con tema chiaro/scuro, animazioni fluide e un design intuitivo che rende divertente tenere traccia dei pezzi di sushi consumati durante le cene con gli amici.

## 🚀 Funzionalità

### 🎮 Gestione Sessioni
- **Creazione sessioni**: Crea una nuova sessione di gioco con un codice univoco
- **Partecipazione**: Unisciti a una sessione esistente tramite codice
- **Gestione giocatori**: Aggiungi e rimuovi giocatori dinamicamente

### 📊 Punteggio e Classifica
- **Contatore real-time**: Tieni traccia dei pezzi di sushi per ogni giocatore
- **Classifica live**: Visualizza la classifica aggiornata in tempo reale
- **Statistiche**: Visualizza statistiche dettagliate per ogni giocatore

### 🎉 Esperienza di Gioco
- **Animazioni**: Animazioni fluide per ogni azione
- **Suoni**: Effetti sonori per un'esperienza coinvolgente
- **Tema personalizzabile**: Supporto per tema chiaro e scuro
- **Fine partita**: Celebrazioni con fuochi d'artificio per il vincitore

### 📱 Interfaccia Utente
- **Design moderno**: Interfaccia pulita e intuitiva
- **Responsive**: Ottimizzata per tutti i dispositivi
- **Accessibilità**: Supporto per screen reader e navigazione assistita

## 🛠️ Tecnologie utilizzate

### Frontend (React Native + Expo)
- **React Native 0.72**: Framework per lo sviluppo mobile cross-platform
- **Expo 49**: Piattaforma per lo sviluppo e deployment
- **React Navigation 6**: Navigazione tra schermate
- **React Native Paper**: Libreria di componenti Material Design
- **Zustand**: Gestione dello stato leggera e performante
- **React Native Reanimated 3**: Animazioni fluide e performanti
- **Expo Google Fonts**: Font personalizzati (Joti One per il titolo)
- **Socket.IO Client**: Comunicazione real-time con il backend

### Backend (Node.js)
- **Node.js 18+**: Runtime JavaScript server-side
- **Express.js**: Framework web minimalista
- **Socket.IO**: Comunicazione bidirezionale real-time
- **SQLite**: Database leggero per la persistenza dei dati
- **CORS**: Gestione delle richieste cross-origin

### Strumenti di Sviluppo
- **TypeScript**: Tipizzazione statica per JavaScript
- **ESLint**: Linting del codice
- **Prettier**: Formattazione automatica del codice

## 📁 Struttura del progetto

```
Sushi-v1/
├── 📱 sushi-game-app/              # Frontend React Native
│   ├── 📂 src/
│   │   ├── 🧩 components/          # Componenti riutilizzabili
│   │   │   ├── PlayerCard.tsx      # Card per visualizzare i giocatori
│   │   │   ├── SushiAnimation.tsx  # Animazioni sushi
│   │   │   └── ThemeToggle.tsx     # Toggle tema chiaro/scuro
│   │   ├── 🧭 navigation/          # Configurazione navigazione
│   │   │   └── AppNavigator.tsx    # Stack navigator principale
│   │   ├── 📱 screens/             # Schermate dell'app
│   │   │   ├── HomeScreen.tsx      # Schermata principale
│   │   │   ├── GameScreen.tsx      # Schermata di gioco
│   │   │   ├── SessionHistoryScreen.tsx # Storico sessioni
│   │   │   └── SettingsScreen.tsx  # Impostazioni
│   │   ├── 🔌 services/            # Servizi esterni
│   │   │   └── socketService.ts    # Gestione Socket.IO
│   │   ├── 🗃️ store/               # Gestione stato globale
│   │   │   └── gameStore.ts        # Store Zustand per il gioco
│   │   ├── 🎨 theme/               # Configurazione tema
│   │   │   └── theme.ts            # Definizione colori e stili
│   │   └── 🛠️ utils/               # Utilità e helper
│   │       └── helpers.ts          # Funzioni di supporto
│   ├── 📦 assets/                  # Risorse statiche
│   │   ├── icon.png               # Icona dell'app
│   │   └── sounds/                # Effetti sonori
│   ├── App.tsx                    # Componente root
│   ├── app.json                   # Configurazione Expo
│   └── package.json               # Dipendenze frontend
│
└── 🖥️ sushi-game-backend/          # Backend Node.js
    ├── server.js                  # Server Express e Socket.IO
    ├── sushi_game.db             # Database SQLite
    └── package.json              # Dipendenze backend
```

## 🚀 Come iniziare

### 📋 Prerequisiti
- **Node.js** (v18 o superiore) - [Download](https://nodejs.org/)
- **npm** o **yarn** - Gestore di pacchetti
- **Expo CLI** - `npm install -g @expo/cli`
- **EAS CLI** - `npm install -g eas-cli` (per build e deploy)
- **Git** - Per il controllo versione

### ⚡ Installazione Rapida

1. **Clona il repository**
```bash
git clone https://github.com/Stevatero/sushi-streak-app-v1.git
cd sushi-streak-app-v1
```

2. **Installa le dipendenze del Frontend**
```bash
cd sushi-game-app
npm install
```

3. **Avvia l'app in modalità sviluppo**
```bash
npx expo start
```

4. **Testa l'app**
- **iOS**: Usa l'app Expo Go dall'App Store
- **Android**: Usa l'app Expo Go dal Play Store
- **Web**: Premi `w` nel terminale Expo
- **Emulatore**: Premi `i` per iOS o `a` per Android

### 🌐 Backend (Già Deployato)

Il backend è già deployato e funzionante su Railway:
- **URL**: https://sushi-streak-production.up.railway.app
- **Status**: ✅ Online 24/7
- **Database**: SQLite persistente

Non è necessario avviare il backend localmente per testare l'app.

### 🔧 Configurazione Avanzata

#### Build per Produzione
```bash
# Login EAS
eas login

# Build per Android
eas build --platform android

# Build per iOS
eas build --platform ios

# Build per entrambe le piattaforme
eas build --platform all
```

#### Deploy Backend (Opzionale)
Se vuoi deployare il tuo backend:
```bash
cd sushi-game-backend
npm install -g @railway/cli
railway login
railway init
railway up
```

## ✅ Funzionalità implementate

- [x] **Gestione Sessioni**: Creazione e partecipazione a sessioni di gioco
- [x] **Conteggio Real-time**: Conteggio pezzi di sushi in tempo reale
- [x] **Classifica Live**: Classifica aggiornata in tempo reale via Socket.IO
- [x] **Fine Partita**: Segnalazione fine pasto con celebrazioni
- [x] **Animazioni**: Animazioni di sushi e fuochi d'artificio
- [x] **Temi**: Supporto per tema chiaro e scuro
- [x] **UI Moderna**: Interfaccia utente moderna e reattiva
- [x] **Font Personalizzati**: Integrazione Google Fonts (Joti One)
- [x] **Suoni**: Effetti sonori per le azioni di gioco
- [x] **Storico**: Visualizzazione storico delle sessioni passate
- [x] **Impostazioni**: Pannello impostazioni con preferenze utente
- [x] **Backend Cloud**: Deploy su Railway con database persistente
- [x] **Build Production**: Configurazione EAS per build iOS/Android
- [x] **Cross-Platform**: Supporto completo iOS, Android e Web

## 🏗️ Architettura e Deploy

### Frontend
- **Piattaforma**: Expo (React Native)
- **Build**: EAS Build per produzione
- **Distribuzione**: App Store, Google Play, Web

### Backend
- **Hosting**: Railway (https://sushi-streak-production.up.railway.app)
- **Database**: SQLite persistente
- **Real-time**: Socket.IO per comunicazione bidirezionale
- **Uptime**: 99.9% garantito

## 🤝 Contribuire

Contributi, issues e feature requests sono benvenuti! Sentiti libero di controllare la [pagina issues](https://github.com/Stevatero/sushi-streak-app-v1/issues).

### Come Contribuire
1. Fai un Fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committa le tue modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pusha sul branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Roadmap

- [ ] **Modalità Torneo**: Sistema di tornei con più sessioni
- [ ] **Statistiche Avanzate**: Grafici e analytics dettagliati
- [ ] **Social Features**: Condivisione risultati sui social
- [ ] **Notifiche Push**: Notifiche per inviti e aggiornamenti
- [ ] **Modalità Offline**: Gioco senza connessione internet
- [ ] **Personalizzazione**: Avatar e temi personalizzati
- [ ] **Leaderboard Globale**: Classifica mondiale dei giocatori

## 📄 Licenza

Questo progetto è sotto licenza MIT - vedi il file [LICENSE](LICENSE) per i dettagli.

## 👨‍💻 Autore

**Stevatero** - [GitHub](https://github.com/Stevatero)

## 🙏 Ringraziamenti

- Grazie alla community di React Native ed Expo
- Ispirato dalle serate sushi con gli amici
- Font Joti One by Google Fonts

---

⭐ Se questo progetto ti è piaciuto, lascia una stella su GitHub!
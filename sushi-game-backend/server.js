const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Inizializzazione app Express
const app = express();
app.use(cors({
  origin: ['http://localhost:8081', 'http://127.0.0.1:8081', 'exp://127.0.0.1:8081', 'http://10.0.2.2:8081', 'exp://10.0.2.2:8081', 'http://192.168.26.103:8081', 'exp://192.168.26.103:8081'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Creazione server HTTP
const server = http.createServer(app);

// Inizializzazione Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Inizializzazione database SQLite
const db = new sqlite3.Database('./sushi_game.db');

// Creazione tabelle
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    finished BOOLEAN DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions (id)
  )`);
});

// Funzione per generare un codice sessione alfanumerico
function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Funzione per verificare se un codice sessione esiste già
function checkSessionExists(sessionId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM sessions WHERE id = ?', [sessionId], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
}

// Funzione per generare un codice sessione unico
async function generateUniqueSessionCode() {
  let sessionCode;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (exists && attempts < maxAttempts) {
    sessionCode = generateSessionCode();
    exists = await checkSessionExists(sessionCode);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Impossibile generare un codice sessione unico');
  }

  return sessionCode;
}

// Dati in memoria per gestire le sessioni attive
const activeSessions = {};

// API Routes
app.post('/api/sessions', async (req, res) => {
  const { sessionName, playerName } = req.body;
  
  try {
    const sessionId = await generateUniqueSessionCode();
    const playerId = uuidv4();

    db.run('INSERT INTO sessions (id, name) VALUES (?, ?)', [sessionId, sessionName], (err) => {
      if (err) {
        console.error('Errore inserimento sessione:', err);
        if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          return res.status(409).json({ error: 'ID sessione già esistente. Riprova.' });
        }
        return res.status(500).json({ error: 'Errore del database: ' + err.message });
      }

      db.run('INSERT INTO players (id, name, session_id) VALUES (?, ?, ?)', 
        [playerId, playerName, sessionId], (err) => {
          if (err) {
            console.error('Errore inserimento giocatore:', err);
            return res.status(500).json({ error: 'Errore inserimento giocatore: ' + err.message });
          }

          // Inizializza la sessione in memoria
          activeSessions[sessionId] = {
            id: sessionId,
            name: sessionName,
            players: [{
              id: playerId,
              name: playerName,
              score: 0,
              finished: false
            }]
          };

          res.status(201).json({ 
            sessionId, 
            playerId,
            sessionName
          });
        });
    });
  } catch (error) {
    console.error('Errore generale:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions/join', (req, res) => {
  const { sessionId, playerName } = req.body;
  const playerId = uuidv4();

  // Verifica se la sessione esiste
  db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    // Verifica se sono passati più di 10 minuti dalla creazione della sessione
    const sessionCreatedAt = new Date(session.created_at);
    const now = new Date();
    const timeDifference = (now - sessionCreatedAt) / (1000 * 60); // differenza in minuti

    if (timeDifference > 10) {
      return res.status(403).json({ error: 'Non è più possibile unirsi a questa sessione. Sono passati più di 10 minuti dalla sua creazione.' });
    }

    db.run('INSERT INTO players (id, name, session_id) VALUES (?, ?, ?)', 
      [playerId, playerName, sessionId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Aggiorna la sessione in memoria
        if (activeSessions[sessionId]) {
          activeSessions[sessionId].players.push({
            id: playerId,
            name: playerName,
            score: 0,
            finished: false
          });
        } else {
          // Carica i giocatori esistenti dal database
          db.all('SELECT * FROM players WHERE session_id = ?', [sessionId], (err, players) => {
            if (err) return res.status(500).json({ error: err.message });

            activeSessions[sessionId] = {
              id: sessionId,
              name: session.name,
              players: players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                finished: p.finished === 1
              }))
            };
          });
        }

        res.status(200).json({ 
          sessionId, 
          playerId,
          sessionName: session.name
        });
      });
  });
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    db.all('SELECT * FROM players WHERE session_id = ?', [sessionId], (err, players) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        id: session.id,
        name: session.name,
        created_at: session.created_at,
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          score: p.score,
          finished: p.finished === 1
        }))
      });
    });
  });
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Nuovo client connesso:', socket.id);

  // Unirsi a una sessione
  socket.on('join_session', ({ sessionId, playerId, playerName }) => {
    socket.join(sessionId);
    console.log(`Giocatore ${playerId} (${playerName}) si è unito alla sessione ${sessionId}`);
    
    // Aggiungi il giocatore alla sessione se non esiste già
    if (activeSessions[sessionId]) {
      // Verifica se il giocatore esiste già
      const playerExists = activeSessions[sessionId].players.some(p => p.id === playerId);
      
      // Se il giocatore non esiste, aggiungilo
      if (!playerExists && playerName) {
        activeSessions[sessionId].players.push({
          id: playerId,
          name: playerName,
          score: 0,
          finished: false
        });
        
        // Aggiorna il database
        db.run('INSERT OR IGNORE INTO players (id, name, session_id) VALUES (?, ?, ?)', 
          [playerId, playerName, sessionId]);
      }
      
      // Invia lo stato attuale della sessione a tutti i client nella stanza
      io.to(sessionId).emit('session_update', activeSessions[sessionId]);
    }
  });

  // Aggiungere un pezzo di sushi
  socket.on('add_piece', ({ sessionId, playerId }) => {
    if (!activeSessions[sessionId]) return;

    // Aggiorna il punteggio in memoria
    const session = activeSessions[sessionId];
    const player = session.players.find(p => p.id === playerId);
    
    if (player && !player.finished) {
      player.score += 1;

      // Aggiorna il database
      db.run('UPDATE players SET score = ? WHERE id = ?', [player.score, playerId]);

      // Notifica tutti i client nella stanza
      io.to(sessionId).emit('session_update', session);
    }
  });

  // Segnalare che il giocatore ha finito
  socket.on('player_finished', ({ sessionId, playerId }) => {
    if (!activeSessions[sessionId]) return;

    // Aggiorna lo stato in memoria
    const session = activeSessions[sessionId];
    const player = session.players.find(p => p.id === playerId);
    
    if (player) {
      player.finished = true;

      // Aggiorna il database
      db.run('UPDATE players SET finished = 1 WHERE id = ?', [playerId]);

      // Verifica se tutti i giocatori hanno finito
      const allFinished = session.players.every(p => p.finished);
      
      // Notifica tutti i client nella stanza
      io.to(sessionId).emit('session_update', session);
      
      if (allFinished) {
        io.to(sessionId).emit('game_ended', session);
      }
    }
  });

  // Disconnessione
  socket.on('disconnect', () => {
    console.log('Client disconnesso:', socket.id);
  });
});

// Avvio del server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
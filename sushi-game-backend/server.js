const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Inizializzazione app Express
const app = express();
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8082', 'http://127.0.0.1:8081', 'http://127.0.0.1:8082', 'exp://127.0.0.1:8081', 'exp://127.0.0.1:8082', 'http://10.0.2.2:8081', 'http://10.0.2.2:8082', 'exp://10.0.2.2:8081', 'exp://10.0.2.2:8082', 'http://192.168.26.103:8081', 'http://192.168.26.103:8082', 'exp://192.168.26.103:8081', 'exp://192.168.26.103:8082', 'http://sushi.dietalab.net', 'https://sushi.dietalab.net', 'http://57.131.31.119'],
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

// Endpoint di health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sushi Streak Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'sushi-streak-backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.post('/api/sessions', async (req, res) => {
  const { sessionName, playerName } = req.body;
  
  try {
    // Validazione input
    if (!sessionName || !playerName) {
      return res.status(400).json({ error: 'sessionName e playerName sono richiesti' });
    }

    // Usa il nome della sessione come ID unico (convertito in maiuscolo per consistenza)
    const sessionId = sessionName.toUpperCase().trim();
    const playerId = uuidv4();

    // Verifica se esiste già una sessione con questo nome
    db.get('SELECT id FROM sessions WHERE id = ?', [sessionId], (err, existingSession) => {
      if (err) {
        console.error('Errore verifica sessione:', err);
        return res.status(500).json({ error: 'Errore del database: ' + err.message });
      }

      if (existingSession) {
        return res.status(409).json({ error: 'Esiste già una sessione con questo nome. Scegli un nome diverso.' });
      }

      db.run('INSERT INTO sessions (id, name) VALUES (?, ?)', [sessionId, sessionName], (err) => {
        if (err) {
          console.error('Errore inserimento sessione:', err);
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
              }],
              lastActivity: Date.now()
            };

            res.status(201).json({ 
              sessionId, 
              playerId,
              sessionName
            });
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
  const normalizedSessionId = String(sessionId || '').toUpperCase().trim();
  const normalizedName = String(playerName || '').trim();
  const newPlayerId = uuidv4();

  // Validazione input
  if (!normalizedSessionId || !normalizedName) {
    return res.status(400).json({ error: 'sessionId e playerName sono richiesti' });
  }

  // Verifica se la sessione esiste
  db.get('SELECT * FROM sessions WHERE id = ?', [normalizedSessionId], (err, session) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    const now = new Date();
    const EXP_MIN = 10;
    if (activeSessions[normalizedSessionId] && typeof activeSessions[normalizedSessionId].lastActivity === 'number') {
      const diffMin = (Date.now() - activeSessions[normalizedSessionId].lastActivity) / (1000 * 60);
      if (diffMin > EXP_MIN) {
        return res.status(403).json({ error: 'Non è più possibile unirsi a questa sessione. Sono passati più di 10 minuti di inattività.' });
      }
    }
    // Verifica se sono passati più di 10 minuti dalla creazione della sessione
    const sessionCreatedAt = new Date(session.created_at + 'Z'); // Forza interpretazione UTC
    const timeDifference = (now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60);

    // Debug: log per capire il problema del timer
    console.log('Debug Timer:');
    console.log('- Session created_at (raw):', session.created_at);
    console.log('- Session created_at (parsed UTC):', sessionCreatedAt);
    console.log('- Current time:', now);
    console.log('- Time difference (minutes):', timeDifference);
    console.log('- Is expired (>10 min)?:', timeDifference > 10);

    if (timeDifference > EXP_MIN) {
      return res.status(403).json({ error: 'Non è più possibile unirsi a questa sessione. Sono passati più di 10 minuti dalla sua creazione.' });
    }

    // Controlla se esiste già un giocatore con lo stesso nome (case-insensitive)
    db.get('SELECT * FROM players WHERE session_id = ? AND LOWER(name) = LOWER(?)', [normalizedSessionId, normalizedName], (err, existingPlayer) => {
      if (err) return res.status(500).json({ error: err.message });

      if (existingPlayer) {
        // Blocca duplicati: il nome è già in uso nella sessione
        return res.status(409).json({ error: 'Nome già in uso' });
      }

      // Nessun duplicato: inserisci nuovo giocatore
      db.run('INSERT INTO players (id, name, session_id) VALUES (?, ?, ?)', 
        [newPlayerId, normalizedName, normalizedSessionId], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Aggiorna la sessione in memoria evitando duplicati di nome
          if (activeSessions[normalizedSessionId]) {
            const nameExists = activeSessions[normalizedSessionId].players.some(p => p.name.toLowerCase() === normalizedName.toLowerCase());
            if (!nameExists) {
              activeSessions[normalizedSessionId].players.push({
                id: newPlayerId,
                name: normalizedName,
                score: 0,
                finished: false
              });
            }
            activeSessions[normalizedSessionId].lastActivity = Date.now();
          } else {
            // Carica i giocatori esistenti dal database
            db.all('SELECT * FROM players WHERE session_id = ?', [normalizedSessionId], (err, players) => {
              if (err) return res.status(500).json({ error: err.message });

              activeSessions[normalizedSessionId] = {
                id: normalizedSessionId,
                name: session.name,
                players: players.map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  finished: p.finished === 1 || p.finished === true
                })),
                lastActivity: Date.now()
              };
            });
          }

          res.status(200).json({ 
            sessionId: normalizedSessionId, 
            playerId: newPlayerId,
            sessionName: session.name
          });
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
      // Verifica se il giocatore esiste già (per id o per nome)
      const playerExists = activeSessions[sessionId].players.some(p => p.id === playerId);
      const nameExists = playerName 
        ? activeSessions[sessionId].players.some(p => (p.name || '').toLowerCase() === playerName.toLowerCase())
        : false;
      
      // Se il giocatore non esiste, aggiungilo
      if (!playerExists && !nameExists && playerName) {
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
      activeSessions[sessionId].lastActivity = Date.now();
      
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

      activeSessions[sessionId].lastActivity = Date.now();
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
      
      activeSessions[sessionId].lastActivity = Date.now();
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

const EXP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  Object.keys(activeSessions).forEach((sid) => {
    const s = activeSessions[sid];
    if (!s || typeof s.lastActivity !== 'number') return;
    if (now - s.lastActivity > EXP_MS) {
      db.run('DELETE FROM players WHERE session_id = ?', [sid], () => {
        db.run('DELETE FROM sessions WHERE id = ?', [sid], () => {});
      });
      delete activeSessions[sid];
    }
  });
}, 60000);

// Endpoint per ottenere informazioni di una sessione per la condivisione
app.get('/api/sessions/:sessionId/info', (req, res) => {
  const { sessionId } = req.params;
  
  // Controlla prima nelle sessioni attive
  if (activeSessions[sessionId]) {
    const session = activeSessions[sessionId];
    const expired = typeof session.lastActivity === 'number' ? (Date.now() - session.lastActivity) > (10 * 60 * 1000) : false;
    if (!expired) {
      return res.json({
        sessionId,
        sessionName: session.name,
        playersCount: session.players.length,
        isActive: true,
        players: session.players.map(p => ({
          name: p.name,
          score: p.score,
          finished: p.finished
        }))
      });
    }
  }
  
  // Se non è attiva, controlla nel database
  db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Errore del database' });
    }
    
    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }
    
    // Ottieni i giocatori della sessione
    db.all('SELECT * FROM players WHERE session_id = ?', [sessionId], (err, players) => {
      if (err) {
        return res.status(500).json({ error: 'Errore del database' });
      }
      
      res.json({
        sessionId,
        sessionName: session.name,
        playersCount: players.length,
        isActive: false,
        players: players.map(p => ({
          name: p.name,
          score: p.score,
          finished: p.finished
        }))
      });
    });
  });
});

// Pagina web per unirsi a una sessione
app.get('/join/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Ottieni informazioni sulla sessione
  const getSessionInfo = () => {
    return new Promise((resolve, reject) => {
      if (activeSessions[sessionId]) {
        const session = activeSessions[sessionId];
        const expired = typeof session.lastActivity === 'number' ? (Date.now() - session.lastActivity) > (10 * 60 * 1000) : false;
        if (!expired) {
          resolve({
            sessionId,
            sessionName: session.name,
            playersCount: session.players.length,
            isActive: true,
            players: session.players
          });
          return;
        }
      } else {
        db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
          if (err) return reject(err);
          if (!session) return reject(new Error('Sessione non trovata'));
          
          db.all('SELECT * FROM players WHERE session_id = ?', [sessionId], (err, players) => {
            if (err) return reject(err);
            resolve({
              sessionId,
              sessionName: session.name,
              playersCount: players.length,
              isActive: false,
              players
            });
          });
        });
        return;
      }
      db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
        if (err) return reject(err);
        if (!session) return reject(new Error('Sessione non trovata'));
        db.all('SELECT * FROM players WHERE session_id = ?', [sessionId], (err, players) => {
          if (err) return reject(err);
          resolve({
            sessionId,
            sessionName: session.name,
            playersCount: players.length,
            isActive: false,
            players
          });
        });
      });
    });
  };
  
  getSessionInfo()
    .then(sessionInfo => {
      const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍣 Sushi Streak - Unisciti alla Sessione</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .sushi-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2rem;
        }
        
        .session-info {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .session-name {
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .session-details {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        
        .detail-item {
            text-align: center;
        }
        
        .detail-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #333;
        }
        
        .detail-label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 5px;
        }
        
        .status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .status.active {
            background: #d4edda;
            color: #155724;
        }
        
        .status.inactive {
            background: #f8d7da;
            color: #721c24;
        }
        
        .players-list {
            margin: 20px 0;
            text-align: left;
        }
        
        .player-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background: white;
            border-radius: 10px;
            border: 1px solid #eee;
        }
        
        .buttons {
            margin-top: 30px;
        }
        
        .btn {
            display: inline-block;
            padding: 15px 30px;
            margin: 10px;
            border: none;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: bold;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .app-store-links {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        
        .app-store-links p {
            color: #666;
            margin-bottom: 15px;
        }
        
        @media (max-width: 600px) {
            .container {
                padding: 30px 20px;
            }
            
            .session-details {
                flex-direction: column;
                gap: 15px;
            }
            
            .btn {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sushi-icon">🍣</div>
        <h1>Sushi Streak</h1>
        <p>Sei stato invitato a una sessione di gioco!</p>
        
        <div class="session-info">
            <div class="session-name">${sessionInfo.sessionName}</div>
            <div class="status ${sessionInfo.isActive ? 'active' : 'inactive'}">
                ${sessionInfo.isActive ? '🟢 Sessione Attiva' : '🔴 Sessione Terminata'}
            </div>
            
            <div class="session-details">
                <div class="detail-item">
                    <div class="detail-value">${sessionInfo.playersCount}</div>
                    <div class="detail-label">Giocatori</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value">${sessionId}</div>
                    <div class="detail-label">Codice Sessione</div>
                </div>
            </div>
            
            ${sessionInfo.players.length > 0 ? `
            <div class="players-list">
                <h3>Giocatori:</h3>
                ${sessionInfo.players.map(player => `
                    <div class="player-item">
                        <span>${player.name}</span>
                        <span>${player.score} 🍣 ${player.finished ? '✅' : ''}</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="buttons">
            ${sessionInfo.isActive ? `
                <a href="sushi-streak://join/${sessionId}" class="btn btn-primary">
                    📱 Apri nell'App
                </a>
            ` : ''}
            <button onclick="copySessionCode()" class="btn btn-secondary">
                📋 Copia Codice
            </button>
        </div>
        
        <div class="app-store-links">
            <p>Non hai ancora l'app? Scaricala qui:</p>
            <a href="#" class="btn btn-primary">📱 App Store</a>
            <a href="#" class="btn btn-primary">🤖 Google Play</a>
        </div>
    </div>
    
    <script>
        function copySessionCode() {
            navigator.clipboard.writeText('${sessionId}').then(() => {
                alert('✅ Codice sessione copiato negli appunti!');
            }).catch(() => {
                // Fallback per browser più vecchi
                const textArea = document.createElement('textarea');
                textArea.value = '${sessionId}';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('✅ Codice sessione copiato negli appunti!');
            });
        }
        
        // Prova ad aprire l'app automaticamente su mobile
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            setTimeout(() => {
                window.location.href = 'sushi-streak://join/${sessionId}';
            }, 1000);
        }
    </script>
</body>
</html>`;
      
      res.send(html);
    })
    .catch(error => {
      res.status(404).send(`
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍣 Sushi Streak - Sessione Non Trovata</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            margin: 0;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        
        p {
            color: #666;
            margin-bottom: 30px;
        }
        
        .btn {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Sessione Non Trovata</h1>
        <p>La sessione richiesta non esiste o è scaduta.</p>
        <a href="#" class="btn">📱 Scarica l'App</a>
    </div>
</body>
</html>`);
    });
});

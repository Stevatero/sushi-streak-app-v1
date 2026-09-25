// Template HTML delle pagine web di invito. Tutti i valori dinamici passano da escapeHtml.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Serializza un valore per inserirlo in modo sicuro dentro un tag <script>
function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp('[\u2028\u2029]', 'g'), (c) => '\\u' + c.charCodeAt(0).toString(16));
}

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .container {
    background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 100%;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center;
  }
  .icon { font-size: 4rem; margin-bottom: 20px; }
  h1 { color: #333; margin-bottom: 10px; font-size: 2rem; }
  p { color: #555; }
  .btn {
    display: inline-block; padding: 15px 30px; margin: 10px; border: none; border-radius: 25px;
    font-size: 1rem; font-weight: bold; text-decoration: none; cursor: pointer; transition: all 0.3s ease;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
  }
  .btn-secondary { background: #6c757d; }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
  @media (max-width: 600px) {
    .container { padding: 30px 20px; }
    .btn { display: block; margin: 10px 0; }
  }
`;

function renderJoinPage(info, nonce = '') {
  const players = [...info.players].sort((a, b) => b.score - a.score);
  const playersHtml = players.length
    ? `<div class="players-list">
        <h3>Giocatori:</h3>
        ${players
          .map(
            (p) => `<div class="player-item">
              <span>${escapeHtml(p.name)}</span>
              <span>${Number(p.score) || 0} 🍣 ${p.finished ? '✅' : ''}</span>
            </div>`
          )
          .join('')}
      </div>`
    : '';

  const deepLink = `sushi-streak://join/${encodeURIComponent(info.sessionId)}`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sushi Streak - Unisciti alla sessione</title>
  <style nonce="${escapeHtml(nonce)}">
    ${baseStyles}
    .session-info { background: #f8f9fa; border-radius: 15px; padding: 25px; margin: 25px 0; }
    .session-name { font-size: 1.5rem; font-weight: bold; color: #667eea; margin-bottom: 15px; word-break: break-word; }
    .session-details { display: flex; justify-content: space-around; margin: 20px 0; }
    .detail-value { font-size: 1.5rem; font-weight: bold; color: #333; }
    .detail-label { font-size: 0.9rem; color: #666; margin-top: 5px; }
    .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
    .status.active { background: #d4edda; color: #155724; }
    .status.inactive { background: #f8d7da; color: #721c24; }
    .players-list { margin: 20px 0; text-align: left; }
    .player-item {
      display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0;
      background: white; border-radius: 10px; border: 1px solid #eee; word-break: break-word;
    }
    @media (max-width: 600px) { .session-details { flex-direction: column; gap: 15px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🍣</div>
    <h1>Sushi Streak</h1>
    <p>Sei stato invitato a una sessione di gioco!</p>

    <div class="session-info">
      <div class="session-name">${escapeHtml(info.sessionName)}</div>
      <div class="status ${info.isActive ? 'active' : 'inactive'}">
        ${info.isActive ? '🟢 Sessione attiva' : '🔴 Sessione terminata'}
      </div>
      <div class="session-details">
        <div>
          <div class="detail-value">${Number(info.playersCount) || 0}</div>
          <div class="detail-label">Giocatori</div>
        </div>
        <div>
          <div class="detail-value">${escapeHtml(info.sessionId)}</div>
          <div class="detail-label">Codice sessione</div>
        </div>
      </div>
      ${playersHtml}
    </div>

    <div>
      ${info.isActive ? `<a href="${escapeHtml(deepLink)}" class="btn">📱 Apri nell'app</a>` : ''}
      <button id="copy-btn" class="btn btn-secondary" type="button">📋 Copia codice</button>
    </div>
  </div>

  <script nonce="${escapeHtml(nonce)}">
    (function () {
      var sessionId = ${jsonForScript(info.sessionId)};
      var deepLink = ${jsonForScript(deepLink)};
      var isActive = ${info.isActive ? 'true' : 'false'};

      function fallbackCopy() {
        var textArea = document.createElement('textarea');
        textArea.value = sessionId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Codice sessione copiato negli appunti!');
      }

      document.getElementById('copy-btn').addEventListener('click', function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(sessionId).then(function () {
            alert('Codice sessione copiato negli appunti!');
          }).catch(fallbackCopy);
        } else {
          fallbackCopy();
        }
      });

      // Prova ad aprire l'app automaticamente su mobile
      if (isActive && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setTimeout(function () { window.location.href = deepLink; }, 1000);
      }
    })();
  </script>
</body>
</html>`;
}

function renderNotFoundPage(nonce = '') {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sushi Streak - Sessione non trovata</title>
  <style nonce="${escapeHtml(nonce)}">${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Sessione non trovata</h1>
    <p>La sessione richiesta non esiste o è scaduta.</p>
  </div>
</body>
</html>`;
}

module.exports = { escapeHtml, jsonForScript, renderJoinPage, renderNotFoundPage };

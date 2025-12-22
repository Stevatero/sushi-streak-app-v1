# 🛠️ Configurazione Server e Deployment

Poiché hai più server Node.js in esecuzione sullo stesso IP (`57.131.31.119`), è fondamentale configurare correttamente il routing per assicurarsi che `sushi.dietalab.net` punti all'applicazione corretta.

Ecco i passaggi per configurare tutto correttamente.

## 1. Gestione del Processo con PM2

Abbiamo creato un file `ecosystem.config.js` nella cartella `sushi-game-backend`. Questo file ti permette di gestire l'applicazione con PM2.

1.  **Installa PM2** (se non c'è già):
    ```bash
    npm install -g pm2
    ```

2.  **Avvia l'applicazione**:
    Nella cartella `sushi-game-backend`:
    ```bash
    # Avvia in modalità produzione (usa la porta 3005 definita nel config per evitare conflitti)
    pm2 start ecosystem.config.js --env production
    
    # Salva la configurazione per il riavvio automatico
    pm2 save
    ```

    *Nota: Ho impostato la porta `3005` per la produzione nel file `ecosystem.config.js` per evitare conflitti con altri server che potrebbero usare la porta 3000. Se vuoi usare una porta diversa, modifica quel file.*

## 2. Configurazione Reverse Proxy (Nginx)

Per far funzionare il dominio `sushi.dietalab.net` senza specificare la porta (es. `http://sushi.dietalab.net:3005`), devi usare Nginx come reverse proxy.

1.  **Crea un blocco server Nginx**:
    Crea un nuovo file di configurazione (es. `/etc/nginx/sites-available/sushi.dietalab.net`):

    ```nginx
    server {
        listen 80;
        server_name sushi.dietalab.net;

        location / {
            proxy_pass http://localhost:3005; # Assicurati che questa porta corrisponda a quella in ecosystem.config.js
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

2.  **Attiva il sito e riavvia Nginx**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/sushi.dietalab.net /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

## 3. Verifica del Funzionamento

Una volta configurato, puoi verificare che tutto funzioni correttamente:

1.  **Health Check Locale (sul server)**:
    ```bash
    curl http://localhost:3005/api/health
    ```
    Dovresti ricevere una risposta JSON con `status: "healthy"`.

2.  **Health Check Pubblico**:
    Visita `http://sushi.dietalab.net/api/health` dal tuo browser o usa curl:
    ```bash
    curl http://sushi.dietalab.net/api/health
    ```

## 4. Troubleshooting Porte

Se hai conflitti di porte:
1.  Controlla le porte in uso: `sudo lsof -i -P -n | grep LISTEN`
2.  Modifica la porta in `ecosystem.config.js`.
3.  Aggiorna la configurazione Nginx (`proxy_pass`) con la nuova porta.
4.  Riavvia PM2 e Nginx.

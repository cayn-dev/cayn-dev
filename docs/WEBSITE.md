# Cayn — portfolio di Jacopo

Portfolio personale di Cayn (Jacopo), web designer e developer indipendente con base in Italia. Il sito presenta servizi, progetti reali, processo di lavoro, FAQ e contatti.

## Il sito

Una pagina editoriale a scorrimento, con tema chiaro/scuro, controlli di movimento, animazioni progressive, elementi Liquid Glass e una modalità leggera per mobile o dispositivi meno performanti.

### Progetti

- **Cashow** — applicazione per la gestione delle finanze personali: [cashow.lovable.app](https://cashow.lovable.app)
- **Agriturismo Occhiominno** — sito e presenza digitale per un agriturismo pugliese: [agriturismocchiominno.com](https://agriturismocchiominno.com)

### Servizi

Siti web aziendali, landing page, design UI/UX, restyling, applicazioni web e strumenti digitali. Il progetto viene seguito direttamente da Jacopo, dalla definizione dei contenuti alla pubblicazione.

### Contatti

- Email: [jacopo.dev0@gmail.com](mailto:jacopo.dev0@gmail.com)
- Sito: [www.cayn.dev](https://www.cayn.dev)
- Base: Italia · collaborazioni disponibili in tutto il mondo

## Struttura

```text
index.html          pagina principale
styles.css          stile e layout
scroll.css          animazioni, modalità leggere e dettagli Liquid Glass
cinematic.css       tipografia, vetro e sfondo monocromatico
cursor-field.js     shader GLSL e interazione con il mouse
scroll.js           navigazione, scroll, tema e motion
assets/             loghi, immagini e poster
fonts/              font locali e relative licenze
```

Per regolare raggio, durata e intensità della scia, vedi [Cursor field](CURSOR-FIELD.md).

## Avvio locale

Il sito è HTML, CSS e JavaScript statico: non richiede Node, Bun o un processo di build.

```sh
python -m http.server 8000
```

Poi apri `http://localhost:8000`. In alternativa, puoi aprire `index.html` direttamente; per provare i comportamenti del browser, è preferibile un server locale.

## Pubblicazione su Vercel

Il repository è configurato come sito statico tramite `vercel.json`: nessun comando di build, directory di output `.`. Il deploy di un branch diverso da quello di produzione genera una Preview; il dominio di produzione continua a usare il branch impostato in Vercel.

## Note

- Il form contatti apre il programma email dell'utente con un messaggio già compilato; non invia dati a un server.
- Il repository contiene solo i file necessari al portfolio e alla sua pubblicazione; il progetto precedente è rimasto nell'altra repo.

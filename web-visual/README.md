## File Catalog Web Visual

Dashboard web leggero (HTML/CSS/JS vanilla) per visualizzare e filtrare il catalogo generato da `output.json`.

### Contenuto
- `index.html`: pagina principale
- `style.css`: stile light, responsive
- `app.js`: logica di fetch/filtri/sorting/dettaglio
- `output.json`: placeholder con dati di esempio (sostituire con il tuo)

### Come usarlo
1. Posiziona `output.json` (generato dallo script Python) nella stessa cartella.
2. Apri `index.html` in un browser moderno (doppio click o `file:///.../web-visual/index.html`).  
   Per Chrome/Edge, se il fetch da file è bloccato, avvia un server statico (es. `python -m http.server` dalla cartella `web-visual`).

### Aggiornare i dati
- Sovrascrivi `output.json` con la nuova versione prodotta dallo script.
- Ricarica la pagina per vedere i nuovi risultati.

### Funzionalità
- Ricerca testuale (filename, summary, tag, modules, content type, process step, language)
- Filtri: estensione, tag, modules (multi-select), content type, process step, language, has images
- Tabella ordinabile
- Pannello di dettaglio con summary completo, metadati e moduli menzionati

### Requisiti
- Nessuna dipendenza esterna; funziona offline con un browser moderno.

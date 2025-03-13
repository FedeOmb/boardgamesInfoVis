const axios = require('axios');
const { parseStringPromise } = require('xml2js');
var fs = require('fs');
var filename = '../data/dataset_converted_cleaned.json'
var targetfile = '../data/dataset_converted_cleaned_prova.json'
var dataset 

fs.readFile(filename, 'utf-8', (err, data) => {
    if (err) throw err;
    dataset = JSON.parse(data)
    id = []
    aggiungiTipoAGiochi(dataset).then(datiAggiornati => {
        //console.log(JSON.stringify(datiAggiornati.nodes, null, 2));
        fs.writeFile(targetfile, JSON.stringify(datiAggiornati), 'utf-8', (werr) => {
            if (werr)
                throw werr;
            console.log("file writed");
        })
      });
});

// Funzione per dividere gli ID in batch da massimo 20 giochi
function chunkArray(array, size) {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
  }
  
  async function aggiungiTipoAGiochi(dati) {
    const ids = dati.nodes.map(nodo => nodo.id);
    const batches = chunkArray(ids, 20); // Dividiamo gli ID in batch da 20
  
    for (const batch of batches) {
        const url = `https://boardgamegeek.com/xmlapi/boardgame/${batch.join(",")}`;
    
      try {
        const response = await axios.get(url);
        const result = await parseStringPromise(response.data);
        const items = result.boardgames.boardgame;
        
        // Mappiamo i risultati sugli ID corrispondenti
        items.forEach(item => {
          const gameId = parseInt(item.$.objectid, 10);
          console.log(gameId)
          const nodo = dati.nodes.find(n => n.id === gameId);
          const type = []
          item.boardgamesubdomain.forEach(ty =>  type.push(ty._));
          if (nodo) nodo.type = type;
        });
        
        console.log(`Batch ${batch.join(",")} aggiornato con successo.`);
        
        // Ritardo per evitare di sovraccaricare l'API
        await new Promise(res => setTimeout(res, 1000));
  
      } catch (error) {
        console.error(`Errore nel recupero dei dati per il batch ${batch.join(",")}:`, error);
      }
    }
    
    return dati;
  }

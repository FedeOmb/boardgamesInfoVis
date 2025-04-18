const axios = require('axios');
const { parseStringPromise } = require('xml2js');
var fs = require('fs');
const path = require('path');
const https = require('https');
var filename = '../data/dataset_converted_cleaned.json'
var targetfile = '../data/dataset_converted_cleaned_v2.json'
var dataset 
const imagesDir = path.join(__dirname, '../game_thumbnails/');

//aggiunta del tipo di gioco
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

fs.readFile(filename, 'utf-8', (err, data) => {
  if (err) throw err;
  dataset = JSON.parse(data)
  id = []
  collectImageLinks(dataset).then(links => {
      //console.log(JSON.stringify(datiAggiornati.nodes, null, 2));
      fs.writeFile('../game_images_links.json', JSON.stringify(links), 'utf-8', (werr) => {
          if (werr)
              throw werr;
          console.log("file writed");
      })
    });
})

fs.readFile("../game_images_links.json", 'utf-8', (err, data) => {
  if (err) throw err;
  dataset = JSON.parse(data)
  downloadAllThumbnails(dataset);
})

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

  async function collectImageLinks(dati) {
    const ids = dati.nodes.map(nodo => nodo.id);
    const batches = chunkArray(ids, 20); // Dividiamo gli ID in batch da 20

    var links = [];
  
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
          const newLink = {              
            id: gameId,
            thumbnail: item.thumbnail[0],
            image: item.image[0],
          }
          links.push(newLink)
          console.log(newLink);
        });
        
        console.log(`Batch ${batch.join(",")} aggiornato con successo.`);
        
        // Ritardo per evitare di sovraccaricare l'API
        await new Promise(res => setTimeout(res, 1000));
  
      } catch (error) {
        console.error(`Errore nel recupero dei dati per il batch ${batch.join(",")}:`, error);
      }
    }
    
    return links;
  }


// Funzione per scaricare una singola immagine
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(imagesDir, filename);
    
    // Determina l'estensione del file dalla URL
    const fileExtension = url.includes('.png') ? '.png' : '.jpg';
    const fullFilePath = `${filePath}${fileExtension}`;
    
    const file = fs.createWriteStream(fullFilePath);
    
    https.get(url, response => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Immagine scaricata: ${fullFilePath}`);
        resolve();
      });
      
      file.on('error', err => {
        fs.unlink(fullFilePath, () => {}); // Pulisce qualsiasi file parzialmente scaricato
        console.error(`Errore durante il download di ${url}: ${err.message}`);
        reject(err);
      });
    }).on('error', err => {
      fs.unlink(fullFilePath, () => {}); // Pulisce qualsiasi file parzialmente scaricato
      console.error(`Errore durante la richiesta per ${url}: ${err.message}`);
      reject(err);
    });
  });
}

// Scarica tutte le thumbnail
async function downloadAllThumbnails(data) {
  console.log('Inizio download delle thumbnail...');
  
  const downloads = data.map(item => {
    return downloadImage(item.thumbnail, item.id.toString());
  });
  
  try {
    await Promise.all(downloads);
    console.log('Tutte le thumbnail sono state scaricate con successo!');
  } catch (error) {
    console.error('Si è verificato un errore durante il download:', error);
  }
}




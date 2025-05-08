const axios = require('axios');
const { parseStringPromise } = require('xml2js');
var fs = require('fs');
const path = require('path');
const https = require('https');
var filename = '../data/dataset_converted_cleaned.json'
var targetfile = '../data/dataset_converted_cleaned_v2.json'
var dataset 
const imagesDir = path.join(__dirname, '../game_thumbnails/');

//add type to games
fs.readFile(filename, 'utf-8', (err, data) => {
    if (err) throw err;
    dataset = JSON.parse(data)
    id = []
    aggiungiTipoAGiochi(dataset).then(datiAggiornati => {
        fs.writeFile(targetfile, JSON.stringify(datiAggiornati), 'utf-8', (werr) => {
            if (werr)
                throw werr;
            console.log("file writed");
        })
      });
});

//get game images
fs.readFile(filename, 'utf-8', (err, data) => {
  if (err) throw err;
  dataset = JSON.parse(data)
  id = []
  collectImageLinks(dataset).then(links => {
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

//Function to split IDs into batches of up to 20 games
function chunkArray(array, size) {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
  }
  
  async function aggiungiTipoAGiochi(dati) {
    const ids = dati.nodes.map(nodo => nodo.id);
    const batches = chunkArray(ids, 20); 
  
    for (const batch of batches) {
        const url = `https://boardgamegeek.com/xmlapi/boardgame/${batch.join(",")}`;
    
      try {
        const response = await axios.get(url);
        const result = await parseStringPromise(response.data);
        const items = result.boardgames.boardgame;
        
        //map the results to the corresponding IDs
        items.forEach(item => {
          const gameId = parseInt(item.$.objectid, 10);
          console.log(gameId)
          const nodo = dati.nodes.find(n => n.id === gameId);
          const type = []
          item.boardgamesubdomain.forEach(ty =>  type.push(ty._));
          if (nodo) nodo.type = type;
        });
        
        console.log(`Batch ${batch.join(",")} aggiornato con successo.`);
        
        //Delay to avoid overloading the API
        await new Promise(res => setTimeout(res, 1000));
  
      } catch (error) {
        console.error(`Errore nel recupero dei dati per il batch ${batch.join(",")}:`, error);
      }
    }
    
    return dati;
  }

  async function collectImageLinks(dati) {
    const ids = dati.nodes.map(nodo => nodo.id);
    const batches = chunkArray(ids, 20); 

    var links = [];
  
    for (const batch of batches) {
        const url = `https://boardgamegeek.com/xmlapi/boardgame/${batch.join(",")}`;
    
      try {
        const response = await axios.get(url);
        const result = await parseStringPromise(response.data);
        const items = result.boardgames.boardgame;
        
        //map the results to the corresponding IDs
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
        
        //Delay to avoid overloading the API
        await new Promise(res => setTimeout(res, 1000));
  
      } catch (error) {
        console.error(`Errore nel recupero dei dati per il batch ${batch.join(",")}:`, error);
      }
    }
    
    return links;
  }


//Function to download a single image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(imagesDir, filename);
    
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
        fs.unlink(fullFilePath, () => {}); //Cleans up any partially downloaded files
        console.error(`Errore durante il download di ${url}: ${err.message}`);
        reject(err);
      });
    }).on('error', err => {
      fs.unlink(fullFilePath, () => {}); //Cleans up any partially downloaded files
      console.error(`Errore durante la richiesta per ${url}: ${err.message}`);
      reject(err);
    });
  });
}

//Download all thumbnails
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




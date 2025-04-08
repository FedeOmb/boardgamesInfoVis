var designers = []
var mechanics = []

Promise.all([
    d3.json("./data/boardgames_100.json"),
    d3.json("data/categories.json"),
    d3.json("data/mechanics.json"),
    d3.json("data/designers.json")
]).then(([_graph, catData, mecData, desData]) =>{
    console.log(JSON.stringify(buildFullNetwork(desData)));
    console.log(JSON.stringify(buildFullNetwork(catData)));
    console.log(JSON.stringify(buildFullNetwork(mecData)));

    var data
    var nodes = []
    var links = []

    data = data_cleaning(_graph)

    for(let i in data){
        let rat = data[i].rating.rating
        let rev = data[i].rating.num_of_reviews
        let cat = data[i].types.categories
        let mec = data[i].types.mechanics
        let des = data[i].credit.designer
        delete data[i].rating
        delete data[i].types
        delete data[i].credit
        data[i].rating = rat
        data[i].num_of_reviews = rev
        data[i].categories = cat
        data[i].mechanics = mec
        data[i].designer = des
    }
    //console.log(data)

    for(let i in data){
        for(let j in data[i].recommendations.fans_liked){
            let temp = {}
            temp.source = data[i].id
            temp.target = data[i].recommendations.fans_liked[j]
            links.push(temp)
        }
    }
    //console.log("LINKS")
    //console.log(JSON.stringify(links))

    for(let i in data){
        let temp = data[i]
        delete temp.recommendations
        nodes.push(temp)
    }
    //console.log("NODES")
    //console.log(JSON.stringify(nodes))

    create_categories(data)
    create_designers(data)
    create_mechanics(data)
    
    dataset_conv_clean = {}
    dataset_conv_clean.nodes = nodes
    dataset_conv_clean.links = links

    console.log("DATASET CONVERTED CLEANED")
    console.log(JSON.stringify(dataset_conv_clean))
})

function data_cleaning(raw_data){
    let data = raw_data
    let games_id = []
    for (let i in data) {
        games_id.push(data[i].id)
    }
    for (let j in data) {
        data[j].recommendations.fans_liked = data[j].recommendations.fans_liked.filter((id) => {return games_id.includes(id)})
    }
    return data
}  

function create_categories(data) {
    const categoriesMap = new Map();

    // Popola le categorie e associa i giochi
    data.forEach(game => {
        game.categories.forEach(category => {
            if (!categoriesMap.has(category.id)) {
                categoriesMap.set(category.id, {
                    id: category.id,
                    name: category.name,
                    games: []
                });
            }
            categoriesMap.get(category.id).games.push(game.id);
        });
    });

    // Converte la mappa in un array
    const categories = Array.from(categoriesMap.values());

    console.log("CATEGORIES");
    console.log(JSON.stringify(categories));
}

function create_mechanics(data) {
    const mechanicsMap = new Map();

    // Popola le meccaniche e associa i giochi
    data.forEach(game => {
        game.mechanics.forEach(mechanic => {
            if (!mechanicsMap.has(mechanic.id)) {
                mechanicsMap.set(mechanic.id, {
                    id: mechanic.id,
                    name: mechanic.name,
                    games: []
                });
            }
            mechanicsMap.get(mechanic.id).games.push(game.id);
        });
    });

    // Converte la mappa in un array
    const mechanics = Array.from(mechanicsMap.values());

    console.log("MECHANICS");
    console.log(JSON.stringify(mechanics));
}

function create_designers(data) {
    const designersMap = new Map();

    // Popola i designer e associa i giochi
    data.forEach(game => {
        game.designer.forEach(designer => {
            if (!designersMap.has(designer.id)) {
                designersMap.set(designer.id, {
                    id: designer.id,
                    name: designer.name,
                    games: []
                });
            }
            designersMap.get(designer.id).games.push(game.id);
        });
    });

    // Converte la mappa in un array
    const designers = Array.from(designersMap.values());

    console.log("DESIGNERS");
    console.log(JSON.stringify(designers));
}

function buildFullNetwork(individuals) {
    const entityToIndividuals = {};

    // Mappa entità (giochi) → designer/categorie/meccaniche
    individuals.forEach(individual => {
        individual.games.forEach(entityId => {
            if (!entityToIndividuals[entityId]) {
                entityToIndividuals[entityId] = [];
            }
            entityToIndividuals[entityId].push(individual.id);
        });
    });

    // Creazione dei nodi
    const nodes = individuals.map(individual => ({
        id: individual.id,
        name: individual.name,
        games: individual.games
    }));

    // Creazione dei link (connessioni tra individui che hanno lavorato sugli stessi giochi)
    const linkMap = new Map();
    const linkGames = new Map();

    for (const entityId in entityToIndividuals) {
        const individualIds = entityToIndividuals[entityId];
        if (individualIds.length > 1) {
            for (let i = 0; i < individualIds.length; i++) {
                for (let j = i + 1; j < individualIds.length; j++) {
                    const source = Math.min(individualIds[i], individualIds[j]);
                    const target = Math.max(individualIds[i], individualIds[j]);
                    const key = `${source}-${target}`;

                    if (linkMap.has(key)) {
                        linkMap.get(key).weight++;
                        linkGames.get(key).push(entityId);
                    } else {
                        linkMap.set(key, {
                            source: source,
                            target: target,
                            weight: 1
                        });
                        linkGames.set(key, [entityId]);
                    }
                }
            }
        }
    }

    // Converte la mappa in un array di oggetti
    const links = Array.from(linkMap.values());

    return { nodes, links };
}

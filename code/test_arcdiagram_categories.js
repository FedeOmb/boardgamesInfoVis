const width = 1000;
const height = 600;
const margin = { top: 20, bottom: 20 };

d3.json("./data/categories.json", function (error, _graph) { 
    if (error) throw error;
    data = _graph

    const designers = _graph;

    console.log(designers)

    // First pass: find all designers with collaborations
    const collaboratingDesigners = new Set();

    // Create a map of game IDs to designer IDs
    const gameToDesigners = {};
    designers.forEach(designer => {
        designer.games.forEach(gameId => {
            if (!gameToDesigners[gameId]) {
                gameToDesigners[gameId] = [];
            }
            gameToDesigners[gameId].push(designer.id);
        });
    });

    // Find all designers with collaborations
    for (const gameId in gameToDesigners) {
        const designerIds = gameToDesigners[gameId];
        if (designerIds.length > 1) {
            designerIds.forEach(id => collaboratingDesigners.add(id));
        }
    }

    // Create nodes array only for collaborating designers
    var nodes = designers
        .filter(designer => collaboratingDesigners.has(designer.id))
        .map(designer => ({
            id: designer.id,
            name: designer.name,
            games: designer.games
        }));

    // After loading the data but before processing collaborations:

    // 1. Sort designers by number of games (descending) and take top 10
    const topDesigners = designers
        .sort((a, b) => b.games.length - a.games.length);

    // 2. Create a Set for quick lookup of top designer IDs
    const topDesignerIds = new Set(topDesigners.map(d => d.id));

    // 3. Filter gameToDesigners to only include games where at least 2 top designers collaborated
    const filteredGameToDesigners = {};
    for (const gameId in gameToDesigners) {
        const designerIds = gameToDesigners[gameId].filter(id => topDesignerIds.has(id));
        if (designerIds.length > 1) {
            filteredGameToDesigners[gameId] = designerIds;
        }
    }

    // 4. Now use these filtered designers and games for the rest of your processing
    for (const gameId in filteredGameToDesigners) {
    filteredGameToDesigners[gameId].forEach(id => collaboratingDesigners.add(id));
    }

    // Create nodes array only for these top designers
    var nodes = topDesigners
        .filter(designer => collaboratingDesigners.has(designer.id))
        .map(designer => ({
            id: designer.id,
            name: designer.name,
            games: designer.games
        }));

    // Create links with weights (only between top designers)
    const linkMap = new Map();
    for (const gameId in filteredGameToDesigners) {
        const designerIds = filteredGameToDesigners[gameId];
        if (designerIds.length > 1) {
            for (let i = 0; i < designerIds.length; i++) {
                for (let j = i + 1; j < designerIds.length; j++) {
                    const source = Math.min(designerIds[i], designerIds[j]);
                    const target = Math.max(designerIds[i], designerIds[j]);
                    const key = `${source}-${target}`;
                    
                    if (linkMap.has(key)) {
                        linkMap.get(key).weight++;
                    } else {
                        linkMap.set(key, {
                            source: source,
                            target: target,
                            weight: 1
                        });
                    }
                }
            }
        }
    }

    // Convert the Map values to an array
    const links = Array.from(linkMap.values());

    console.log(nodes);
    console.log(links);

    // Create the final graph object
    const graph = {
        nodes: nodes,
        links: links
    };

    data = graph;

    // Creazione scala x per posizionare i nodi
    const xScale = d3.scalePoint()
      .domain(nodes.map(d => d.id))
      .range([50, width - 50]);

    // Creazione SVG
    const svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

    // Disegnare gli archi
    svg.selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', d => {
        const x1 = xScale(d.source);
        const x2 = xScale(d.target);
        const r = Math.abs(x2 - x1) / 2;
        const y = height / 2;
        return `M${x1},${y} A${r},${r} 0 0,1 ${x2},${y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#69b3a2')
      .attr('stroke-width', 1);

    // Disegnare i nodi
    svg.selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.id))
      .attr('cy', height / 2)
      .attr('r', 5)
      .attr('fill', '#ff5733');
    })
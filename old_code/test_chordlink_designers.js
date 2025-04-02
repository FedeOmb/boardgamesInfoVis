var data = {};
d3.json("./data/designers.json", function (error, _graph) { 
    if (error) throw error;
    
    const designers = _graph;

    // 1. First find all designers with collaborations
    const gameToDesigners = {};
    const collaboratingDesigners = new Set();
    
    designers.forEach(designer => {
        designer.games.forEach(gameId => {
            if (!gameToDesigners[gameId]) {
                gameToDesigners[gameId] = [];
            }
            gameToDesigners[gameId].push(designer.id);
        });
    });

    for (const gameId in gameToDesigners) {
        const designerIds = gameToDesigners[gameId];
        if (designerIds.length > 1) {
            designerIds.forEach(id => collaboratingDesigners.add(id));
        }
    }

    // 2. Get collaborating designers and sort by number of games
    const collaboratingDesignersList = designers
        .filter(designer => collaboratingDesigners.has(designer.id))
        .sort((a, b) => b.games.length - a.games.length);
        //.slice(0, 20);  // Take top 10

    // 3. Create Set of these top collaborating designer IDs
    const topDesignerIds = new Set(collaboratingDesignersList.map(d => d.id));

    // 4. Filter collaborations to only include these top designers
    const filteredGameToDesigners = {};
    for (const gameId in gameToDesigners) {
        const designerIds = gameToDesigners[gameId].filter(id => topDesignerIds.has(id));
        if (designerIds.length > 1) {
            filteredGameToDesigners[gameId] = designerIds;
        }
    }

    // 5. Create final nodes array
    const nodes = collaboratingDesignersList.map(designer => ({
        id: designer.id,
        name: designer.name,
        games: designer.games
    }));

    // 6. Create links between these designers
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

    const links = Array.from(linkMap.values());
    data = { nodes, links };

    // Calculate node strengths for sorting
    const nodeStrength = new Map();
    nodes.forEach(node => nodeStrength.set(node.id, 0));
    links.forEach(link => {
        nodeStrength.set(link.source, nodeStrength.get(link.source) + link.weight);
        nodeStrength.set(link.target, nodeStrength.get(link.target) + link.weight);
    });

    // Sort nodes by collaboration strength (descending)
    nodes.sort((a, b) => nodeStrength.get(b.id) - nodeStrength.get(a.id));

    // Rest of your chord diagram code...
    console.log("Top 10 collaborating designers by game count:", 
        nodes.map(d => `${d.name} (${d.games.length} games, ${nodeStrength.get(d.id)} collaborations)`));

    // Prepare data for the chord diagram
    const nodeMap = new Map(nodes.map((node, i) => [node.id, i]));

    // Create matrix
    const matrix = Array.from({ length: nodes.length }, () => 
        Array.from({ length: nodes.length }, () => 0)
    );

    links.forEach(link => {
        const sourceIndex = nodeMap.get(link.source);
        const targetIndex = nodeMap.get(link.target);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
            matrix[sourceIndex][targetIndex] += link.weight;
            matrix[targetIndex][sourceIndex] += link.weight;
        }
    });

    // Set up the chord diagram
    const width = 800;
    const height = 800;
    const outerRadius = Math.min(width, height) * 0.5 - 100;
    const innerRadius = outerRadius - 30;

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
        .radius(innerRadius);

    const chords = chord(matrix);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw chords
    svg.append("g")
        .selectAll("path")
        .data(chords)
        .enter()
        .append("path")
        .attr("d", ribbon)
        .style("fill", d => color(d.source.index))
        .style("stroke", d => d3.rgb(color(d.source.index)).darker())
        .style("opacity", 0.8)
        .on("mouseover", function(d) {
            d3.select(this).style("opacity", 1);
        })
        .on("mouseout", function(d) {
            d3.select(this).style("opacity", 0.8);
        });

    // Draw arcs
    svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .enter()
        .append("g")
        .append("path")
        .attr("d", arc)
        .style("fill", d => color(d.index))
        .style("stroke", d => d3.rgb(color(d.index)).darker());

    // Add labels
    svg.append("g")
        .selectAll("text")
        .data(chords.groups)
        .enter()
        .append("text")
        .each(function(d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
            d.name = nodes[d.index].name;
        })
        .attr("transform", d => `
            rotate(${d.angle * 180 / Math.PI - 90})
            translate(${outerRadius + 10})
            ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
        .text(d => d.name)
        .style("font-size", "10px")
        .style("font-family", "sans-serif");
});
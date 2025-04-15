var games = [];
var categoriesNetwork = [];
var mechanicsNetwork = [];
var designersNetwork = [];
var gamesNetwork = {};
var designersToVis = {};
var categoriesToVis = {};
var mechanicsToVis = {};

const gameTitles = {};

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("visibility", "hidden");

Promise.all([
    d3.json("data/dataset_converted_cleaned_v2.json"),
    d3.json("data/categories_network.json"),
    d3.json("data/mechanics_network.json"),
    d3.json("data/designers_network.json")
]).then(([data, catData, mecData, desData]) => {
    games = data.nodes.map(game => ({ id: game.id, title: game.title }));
    games.forEach(game => {
        gameTitles[game.id] = game.title;
    })
    gamesNetwork = data;
    categoriesNetwork = catData
    mechanicsNetwork = mecData
    designersNetwork = desData

    // filtra i dati dei designer e inizializza la visualizzazione
    let dataToVis = prepareData(designersNetwork);
    createChordDiagram(dataToVis);
    designersToVis = dataToVis;
});

function createDiagram(type) {
    if (type === "designers") {
        if (!designersToVis.nodes) {
            let data = prepareData(designersNetwork);
            createChordDiagram(data);
            designersToVis = data;
        } else {
            createChordDiagram(designersToVis);
        }
    }
    else if (type === "categories") {
        if (!categoriesToVis.nodes) {
            let data = prepareData(categoriesNetwork);
            createChordDiagram(data);
            categoriesToVis = data;
        } else {
            createChordDiagram(categoriesToVis);
        }
    }
    else if (type === "mechanics") {
        if (!mechanicsToVis.nodes) {
            let data = prepareData(mechanicsNetwork);

            createChordDiagram(data);
            mechanicsToVis = data;
        } else {
            createChordDiagram(mechanicsToVis);
        }
    }
}


function prepareData(dataset) {
    const network = dataset;
    //set per le categorie, meccaniche e designer che sono in comune in qualche gioco
    const collaboratingIndividuals = new Set();
    // mantiene per ogni id di un gioco gli id dei suoi designer, categorie o meccaniche
    const gamesToIndividualsMap = {};

    network.nodes.forEach(individual => {
        individual.games.forEach(game => {
            if (!gamesToIndividualsMap[game]) {
                gamesToIndividualsMap[game] = [];
            }
            gamesToIndividualsMap[game].push(individual.id);
        });
    });
    console.log("games to individual map", gamesToIndividualsMap);

    //filtra i designer, categorie e meccaniche che sono in comune in un gioco
    network.links.forEach(link => {
        collaboratingIndividuals.add(link.source);
        collaboratingIndividuals.add(link.target);
    });
    console.log("collaborating individuals2", collaboratingIndividuals);

    //trova la componente connessa più grande nella rete di collaborazioni
    let largestComponent = new Set();
    network.nodes.forEach(individual => {
        let component = findConnectedComponent(individual.id, gamesToIndividualsMap);
        //console.log("component", component);
        if (component.size > largestComponent.size) {
            largestComponent = component;
        }
    });
    console.log("largest component", largestComponent);

    //nodi componente connessa massima
    let topIndividuals = network.nodes.filter(d => largestComponent.has(d.id));

    //se la componente è troppo piccola aggiunge altri nodi tra quelli che hanno più giochi
    if (topIndividuals.length < 10) {
        const additionalIndividuals = Array.from(collaboratingIndividuals)
            .map(id => network.nodes.find(ind => ind.id === id))
            .filter(ind => !largestComponent.has(ind.id)) // exclude ones we already have
            .sort((a, b) => {
                const aCount = Object.values(gamesToIndividualsMap).filter(ids => ids.includes(a.id)).length;
                const bCount = Object.values(gamesToIndividualsMap).filter(ids => ids.includes(b.id)).length;
                return bCount - aCount;
            })
            .slice(0, 10 - topIndividuals.length);

        topIndividuals = topIndividuals.concat(additionalIndividuals);
    }
    //ordina i nodi in base al numero di giochi e prende i primi 10
    console.log("top individuals after adding new", topIndividuals);
    topIndividuals.sort((a, b) => d3.descending(a.games.length, b.games.length));
    console.log("top individuals sorted", topIndividuals);
    topIndividuals = topIndividuals.slice(0, 10);
    console.log("top individuals after slice", topIndividuals);

    const topIndividualIds = new Set(topIndividuals.map(d => d.id));

    // Filtra i link esistenti per mantenere solo quelli tra i top designers
    var relevantLinks = network.links.filter(link =>
        topIndividualIds.has(link.source) && topIndividualIds.has(link.target)
    );

    console.log("relevant links", relevantLinks);

    relevantLinks = relevantLinks.map(link => {
        const sourceNode = network.nodes.find(n => n.id === link.source);
        const targetNode = network.nodes.find(n => n.id === link.target);
        const commonGames = sourceNode.games.filter(game =>
            targetNode.games.includes(game)
        );
        return {
            ...link,
            commonGames: commonGames
        };
    });
    console.log("relevant links with common games", relevantLinks);

    // Crea la matrice per il chord diagram
    const nodeMap = new Map(topIndividuals.map((node, i) => [node.id, i]));
    console.log("node map", nodeMap);
    const matrix = Array.from({ length: topIndividuals.length }, () =>
        Array.from({ length: topIndividuals.length }, () => 0)
    );

    // Popola la matrice usando i link filtrati
    relevantLinks.forEach(link => {
        const sourceIndex = nodeMap.get(link.source);
        const targetIndex = nodeMap.get(link.target);
        matrix[sourceIndex][targetIndex] = link.weight;
        matrix[targetIndex][sourceIndex] = link.weight;
    });
    console.log("matrix", matrix);
    console.log("refined nodes", topIndividuals);
    console.log("link games", relevantLinks);
    return { nodes: topIndividuals, links: relevantLinks, matrix };
}


// Trova i gruppi di individui connessi
function findConnectedComponent(startId, gamesToIndividualsMap) {
    let visited = new Set();
    let queue = [startId];

    while (queue.length > 0) {
        let current = queue.pop();
        if (!visited.has(current)) {
            visited.add(current);
            // Aggiungi vicini alla coda
            for (const game in gamesToIndividualsMap) {
                if (gamesToIndividualsMap[game].includes(current)) {
                    gamesToIndividualsMap[game].forEach(id => {
                        if (!visited.has(id)) queue.push(id);
                    });
                }
            }
        }
    }
    return visited;
}

function createChordDiagram(dataToVis) {
    
    const { nodes, links, matrix } = dataToVis;

    const cont = d3.select(".chord-container");
    var contWidth = +cont.node().getBoundingClientRect().width;
    var contHeight = +cont.node().getBoundingClientRect().height;

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const svgWidth = Math.max(contWidth, 1000)
    const svgHeight = Math.max(contHeight, 560)
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    cont.selectAll("*").remove();
    const outerSvg = cont.append("svg")
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)

    const svg = outerSvg.append("g")
        .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    const outerRadius = Math.min(width, height) * 0.5 - 50;
    const innerRadius = outerRadius - 20;

    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbon().radius(innerRadius);
    const chords = chord(matrix);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    var arcSelected = false;

    const mousemove = function (event, d) {
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }

    //disegna i collegamenti nel chord diagram
    svg.append("g")
        .selectAll("path")
        .data(chords)
        .enter()
        .append("path")
        .attr("class", "ribbon")
        .attr("d", ribbon)
        .style("fill", d => color(d.source.index))
        .style("stroke", d => d3.rgb(color(d.source.index)).darker())
        .style("opacity", 0.8)
        .on("mouseover", function (event, d) {
            if (!arcSelected) {
                d3.select(this).style("opacity", 1);
            }
            tooltip.transition().duration(200).style("visibility", "visible");

            const sourceId = nodes[d.source.index].id;
            const targetId = nodes[d.target.index].id;

            // Trova il link corrispondente e ottieni i giochi in comune
            const link = links.find(l =>
                (l.source === sourceId && l.target === targetId) ||
                (l.source === targetId && l.target === sourceId)
            );

            const commonGames = link.commonGames.map(id => ({
                id: id,
                title: gameTitles[id] || `Unknown Game (ID: ${id})`
            }));

            const sourceName = nodes[d.source.index].name;
            const targetName = nodes[d.target.index].name;

            let tooltipContent = `<strong>Connection: ${sourceName} ↔ ${targetName}</strong><br>`;
            tooltipContent += `<em>${commonGames.length} game(s) in common:</em><br><ul>`;
            commonGames.forEach(game => {
                tooltipContent += `<li>${game.title}</li>`;
            });
            tooltipContent += `</ul>`;
            tooltip.html(tooltipContent)
        })
        .on("mousemove", mousemove)
        .on("mouseout", function () {
            if (!arcSelected) {
                d3.select(this).style("opacity", 0.8);
            }
            tooltip.transition().duration(500).style("visibility", "hidden");
        });
    
    // disegna gli archi circolari
    svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .enter()
        .append("g")
        .append("path")
        .attr("class", "arc")
        .attr("d", arc)
        .style("fill", d => color(d.index))
        .style("stroke", d => d3.rgb(color(d.index)).darker())
        .on("mouseover", function (event, d) {
            if (!arcSelected) {
                const index = d.index;
                d3.select(this).style("fill", d => d3.rgb(color(index)).darker(0.5));

                svg.selectAll(".ribbon")
                    .transition()
                    .duration(200)
                    .style("opacity", p => (p.source.index === index || p.target.index === index) ? 1 : 0.1);
            }
        })
        .on("mouseout", function (event, d) {
            if (!arcSelected) {
                const index = d.index;
                d3.select(this).style("fill", d => d3.rgb(color(index)));

                svg.selectAll(".ribbon")
                    .transition()
                    .duration(200)
                    .style("opacity", 0.8);
            }
        })
        .on("click", function (event, d) {
            const index = d.index;
            svg.selectAll(".arc").style("fill", d => color(d.index));

            d3.select(this).style("fill", d => d3.rgb(color(index)).darker(0.5));

            svg.selectAll(".ribbon")
                .transition()
                .duration(200)
                .style("opacity", p => (p.source.index === index || p.target.index === index) ? 1 : 0.1);

            arcSelected = true;
        });

    // aggiunge le etichette per gli elementi agli archi
    svg.append("g")
        .selectAll("text")
        .data(chords.groups)
        .enter()
        .append("text")
        .each(function (d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
            d.name = nodes[d.index].name;
            d.textAnchor = d.flipped ? "end" : "start";
            d.rotate = d.angle * 180 / Math.PI - 90;
            d.flipped = d.angle > Math.PI;
            d.textLenght = d3.select(this).node().getComputedTextLength()
        })
        .attr("transform", d => `
            rotate(${d.rotate})
            translate(${outerRadius + 10})
            ${d.flipped ? "rotate(180)" : ""}
        `)
        .attr("text-anchor", d => d.flipped ? "end" : null)
        .attr("dy", "0.35em")
        .text(d => d.name)
        .style("font-size", "0.7rem")
        .style("font-family", "sans-serif")
        .call(wrapArcText, 50, outerRadius)
        .style("paint-order", "stroke")
        .style("font-weight", "bold");

    // listener per i click sulle aree vuote dell'svg
    outerSvg.on("click", (event) => {
        console.log("click", event.target);
        if (event.target.tagName === "svg") {
            svg.selectAll(".ribbon")
                .transition()
                .duration(200)
                .style("opacity", 0.8);

            svg.selectAll(".arc")
                .transition()
                .duration(200)
                .style("fill", d => color(d.index));

            arcSelected = false;
        }
    });

    adjustForViewport(svg);
}


function truncateName(name, maxLength = 15) {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
}

// Add this helper function for text wrapping
function wrapArcText(text, width) {
    text.each(function () {
        var textElement = d3.select(this);
        var words = textElement.text().split(/\s+/).reverse();
        var word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // Spaziatura più uniforme
            x = textElement.attr("x") || 0, // Mantieni la posizione x originale
            y = textElement.attr("y") || 0, // Mantieni la posizione y originale
            dy = parseFloat(textElement.attr("dy")) || 0,
            tspan = textElement.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = textElement.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
}

// Add this adjustment to prevent screen cutting
function adjustForViewport(svg, padding = 40) {
    const bbox = svg.node().getBBox();
    const width = +svg.attr("width");
    const height = +svg.attr("height");

    // Check if any labels extend beyond viewport
    svg.selectAll("text").each(function () {
        const text = d3.select(this);
        const textBBox = this.getBBox();

        // Calculate position relative to SVG
        const x = textBBox.x + bbox.x;
        const y = textBBox.y + bbox.y;

        // Adjust vertical position if needed
        if (y < padding) {
            text.attr("dy", padding - y + "px");
        } else if (y + textBBox.height > height - padding) {
            text.attr("dy", (height - padding - y - textBBox.height) + "px");
        }
    });
}

/*
function prepareData_oldvers(dataset){
    const network = dataset;
    //set per le categorie, meccaniche e designer che sono in comune in qualche gioco
    const collaboratingIndividuals = new Set(); 
    // mapppa per i giochi le loro categorie, meccaniche e designer

    const gamesToIndividualsMap = {}; 

    network.nodes.forEach(individual => {
        individual.games.forEach(game => {
            if (!gamesToIndividualsMap[game]) {
                gamesToIndividualsMap[game] = [];
            }
            gamesToIndividualsMap[game].push(individual.id);
        });
    });
    console.log("games to individual map", gamesToIndividualsMap);

    for (const game in gamesToIndividualsMap) {
        const individualIds = gamesToIndividualsMap[game];
        if (individualIds.length > 1) {
            individualIds.forEach(id => collaboratingIndividuals.add(id));
        }
    }

    console.log("collaborating individuals", collaboratingIndividuals); 

    let largestComponent = new Set();
    network.nodes.forEach(individual => {
        let component = findConnectedComponent(individual.id, gamesToIndividualsMap);
        //console.log("component", component);
        if (component.size > largestComponent.size) {
            largestComponent = component;
        }
    });
    console.log("largest component", largestComponent); 
    
    //nodi componente connessa massima
    let topIndividuals = network.nodes.filter(d => largestComponent.has(d.id));
    console.log("top individuals", topIndividuals);
    
    //se la componente è troppo piccola aggiunge altri nodi tra quelli che hanno più giochi
    if (topIndividuals.length < 10) {
        const additionalIndividuals = Array.from(collaboratingIndividuals)
            .map(id => network.nodes.find(ind => ind.id === id))
            .filter(ind => !largestComponent.has(ind.id)) // exclude ones we already have
            .sort((a, b) => {
                const aCount = Object.values(gamesToIndividualsMap).filter(ids => ids.includes(a.id)).length;
                const bCount = Object.values(gamesToIndividualsMap).filter(ids => ids.includes(b.id)).length;
                return bCount - aCount;
            })
            .slice(0, 10 - topIndividuals.length);
        
        topIndividuals = topIndividuals.concat(additionalIndividuals);
    }
    console.log("top individuals", topIndividuals);
    topIndividuals.sort((a, b) => d3.descending(a.games.length, b.games.length));
    console.log("top individuals sorted", topIndividuals);
    topIndividuals = topIndividuals.slice(0, 10);
    console.log("top individuals after slice", topIndividuals);

    const topIndividualIds = new Set(topIndividuals.map(d => d.id));
    
    //mappa che include solo i giochi collegati agli individui principali
    const filteredGamesToIndividuals = {};

    for (const game in gamesToIndividualsMap) {
        const individualIds = gamesToIndividualsMap[game].filter(id => topIndividualIds.has(id));
        if (individualIds.length > 1) {
            filteredGamesToIndividuals[game] = individualIds;
        }
    }

    for (const game in filteredGamesToIndividuals) {
        filteredGamesToIndividuals[game].forEach(id => collaboratingIndividuals.add(id));
    }
    console.log("filtered games to individuals", filteredGamesToIndividuals);   
    console.log("collaborating individuals after filtering", collaboratingIndividuals);

    const refinedNodes = topIndividuals
        .filter(individual => collaboratingIndividuals.has(individual.id))
        .map(individual => ({
            id: individual.id,
            name: individual.name,
            games: individual.games
        }));

    console.log("refined nodes", refinedNodes);

    const linkMap = new Map();
    const linkGames = new Map();

    for (const game in filteredGamesToIndividuals) {
        const individualIds = filteredGamesToIndividuals[game];
        if (individualIds.length > 1) {
            for (let i = 0; i < individualIds.length; i++) {
                for (let j = i + 1; j < individualIds.length; j++) {
                    const source = Math.min(individualIds[i], individualIds[j]);
                    const target = Math.max(individualIds[i], individualIds[j]);
                    const key = `${source}-${target}`;

                    if (linkMap.has(key)) {
                        linkMap.get(key).weight++;
                        linkGames.get(key).push(game);
                    } else {
                        linkMap.set(key, {
                            source: source,
                            target: target,
                            weight: 1
                        });
                        linkGames.set(key, [game]);
                    }
                }
            }
        }
    }
    console.log("link map", linkMap);
    console.log("link games", linkGames);

    const links = Array.from(linkMap.values());
    const graph = { nodes: refinedNodes, links: links };
    console.log("graph", graph);

    const nodeStrength = new Map();
    refinedNodes.forEach(node => nodeStrength.set(node.id, 0));
    graph.links.forEach(link => {
        nodeStrength.set(link.source, nodeStrength.get(link.source) + link.weight);
        nodeStrength.set(link.target, nodeStrength.get(link.target) + link.weight);
    });

    refinedNodes.sort((a, b) => d3.descending(a.name, b.name));
    const nodeMap = new Map(refinedNodes.map((node, i) => [node.id, i]));
    const matrix = Array.from({ length: refinedNodes.length }, () => 
        Array.from({ length: refinedNodes.length }, () => 0)
    );

    graph.links.forEach(link => {
        const sourceIndex = nodeMap.get(link.source);
        const targetIndex = nodeMap.get(link.target);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
            matrix[sourceIndex][targetIndex] += link.weight;
            matrix[targetIndex][sourceIndex] += link.weight;
        }
    });
    console.log("matrix", matrix);
    console.log("refined nodes", refinedNodes);
    console.log("link games", linkGames);


    return { refinedNodes, linkGames, matrix };
}
*/
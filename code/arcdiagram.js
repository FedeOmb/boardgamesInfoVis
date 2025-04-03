function createArcDiagram(dataset) {

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

    d3.select("svg").selectAll("*")
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    const individuals = dataset;
    const collaboratingIndividuals = new Set();
    const entityToIndividuals = {};

    individuals.forEach(individual => {
        individual.games.forEach(entityId => {
            if (!entityToIndividuals[entityId]) {
                entityToIndividuals[entityId] = [];
            }
            entityToIndividuals[entityId].push(individual.id);
        });
    });

    for (const entityId in entityToIndividuals) {
        const individualIds = entityToIndividuals[entityId];
        if (individualIds.length > 1) {
            individualIds.forEach(id => collaboratingIndividuals.add(id));
        }
    }

    const nodes = individuals
        .filter(individual => collaboratingIndividuals.has(individual.id))
        .map(individual => ({
            id: individual.id,
            name: individual.name,
            games: individual.games
        }));

    let largestComponent = new Set();
    individuals.forEach(individual => {
        let component = findConnectedComponent(individual.id, entityToIndividuals);
        if (component.size > largestComponent.size) {
            largestComponent = component;
        }
    });
    
    // Start with individuals from the largest component
    let topIndividuals = individuals.filter(d => largestComponent.has(d.id));
    
    // If we don't have enough, add other collaborating individuals
    if (topIndividuals.length < 10) {
        const additionalIndividuals = Array.from(collaboratingIndividuals)
            .map(id => individuals.find(ind => ind.id === id))
            .filter(ind => !largestComponent.has(ind.id)) // exclude ones we already have
            .sort((a, b) => {
                const aCount = Object.values(entityToIndividuals).filter(ids => ids.includes(a.id)).length;
                const bCount = Object.values(entityToIndividuals).filter(ids => ids.includes(b.id)).length;
                return bCount - aCount;
            })
            .slice(0, 10 - topIndividuals.length);
        
        topIndividuals = topIndividuals.concat(additionalIndividuals);
    }
    
    // Still limit to 10 in case we somehow got more
    topIndividuals = topIndividuals.slice(0, 10);

    const topIndividualIds = new Set(topIndividuals.map(d => d.id));
    const filteredEntityToIndividuals = {};

    for (const entityId in entityToIndividuals) {
        const individualIds = entityToIndividuals[entityId].filter(id => topIndividualIds.has(id));
        if (individualIds.length > 1) {
            filteredEntityToIndividuals[entityId] = individualIds;
        }
    }

    for (const entityId in filteredEntityToIndividuals) {
        filteredEntityToIndividuals[entityId].forEach(id => collaboratingIndividuals.add(id));
    }

    const refinedNodes = topIndividuals
        .filter(individual => collaboratingIndividuals.has(individual.id))
        .map(individual => ({
            id: individual.id,
            name: individual.name,
            games: individual.games
        }));

    const linkMap = new Map();
    const linkGames = new Map();

    for (const entityId in filteredEntityToIndividuals) {
        const individualIds = filteredEntityToIndividuals[entityId];
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

    const links = Array.from(linkMap.values());
    const graph = { nodes: refinedNodes, links: links };

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

    const cont = d3.select(".chord-container");
    var contWidth = +cont.node().getBoundingClientRect().width;
    var contHeight = +cont.node().getBoundingClientRect().height;

    const margin = {top: 40, right: 20, bottom: 20, left: 20};
    const svgWidth = Math.max(contWidth, 1000) 
    const svgHeight = Math.max(contHeight, 560) 
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    cont.selectAll("*").remove();
    const svg = cont.append("svg")
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        .append("g")
        .attr("transform", `translate(${width/2 + margin.left},${height/2 + margin.top})`);

    //const outerRadius = Math.min(width, height) * 0.5 - 100;
    //const innerRadius = outerRadius - 30;
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

    svg.append("g")
        .selectAll("path")
        .data(chords)
        .enter()
        .append("path")
        .attr("d", ribbon)
        .style("fill", d => color(d.source.index))
        .style("stroke", d => d3.rgb(color(d.source.index)).darker())
        .style("opacity", 0.8)
        .on("mouseover", function (d) {
            d3.select(this).style("opacity", 1);
            tooltip.transition().duration(200).style("visibility", "visible");

            const sourceId = refinedNodes[d.source.index].id;
            const targetId = refinedNodes[d.target.index].id;
            const linkKey = `${Math.min(sourceId, targetId)}-${Math.max(sourceId, targetId)}`;
            
            const commonGameIds = linkGames.get(linkKey) || [];
            const commonGames = commonGameIds.map(id => ({
                id: id,
                title: gameTitles[id] || `Unknown Game (ID: ${id})`
            }));
            
            const sourceName = refinedNodes[d.source.index].name;
            const targetName = refinedNodes[d.target.index].name;
            
            // Format tooltip content
            let tooltipContent = `<strong>Connection: ${sourceName} ↔ ${targetName}</strong><br>`;
            tooltipContent += `<em>${commonGames.length} game(s) in common:</em><br><ul>`;
            commonGames.forEach(game => {
                tooltipContent += `<li>${game.title}</li>`;
            });
            tooltipContent += `</ul>`;

            tooltip.html(tooltipContent)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).style("opacity", 0.8);
            tooltip.transition().duration(500).style("visibility", "hidden");
        });

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
            d.name = refinedNodes[d.index].name;
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
        .style("font-size", "10px")
        .style("font-family", "sans-serif")
        .call(wrapText, 50, outerRadius)
        .style("paint-order", "stroke")
        .style("font-weight", "bold");

    adjustForViewport(svg);  
}

// Trova i gruppi di individui connessi
function findConnectedComponent(startId, entityToIndividuals) {
    let visited = new Set();
    let queue = [startId];

    while (queue.length > 0) {
        let current = queue.pop();
        if (!visited.has(current)) {
            visited.add(current);
            // Aggiungi vicini alla coda
            for (const entityId in entityToIndividuals) {
                if (entityToIndividuals[entityId].includes(current)) {
                    entityToIndividuals[entityId].forEach(id => {
                        if (!visited.has(id)) queue.push(id);
                    });
                }
            }
        }
    }
    return visited;
}

function truncateName(name, maxLength = 15) {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
}

// Add this helper function for text wrapping
function wrapText(text, width) {
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
function adjustForViewport(svg, padding = 20) {
    const bbox = svg.node().getBBox();
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    
    // Check if any labels extend beyond viewport
    svg.selectAll("text").each(function() {
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

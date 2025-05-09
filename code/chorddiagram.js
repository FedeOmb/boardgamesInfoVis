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

    // filters designer data and initializes visualization
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
    //Sets for categories, mechanics, and designers that are in common in some game
    const collaboratingIndividuals = new Set();
    //maintains for each id of a game the ids of its designers, categories, or mechanics
    const gamesToIndividualsMap = {};

    network.nodes.forEach(individual => {
        individual.games.forEach(game => {
            if (!gamesToIndividualsMap[game]) {
                gamesToIndividualsMap[game] = [];
            }
            gamesToIndividualsMap[game].push(individual.id);
        });
    });

    //filters designers, categories, and mechanics that are in common in a game
    network.links.forEach(link => {
        collaboratingIndividuals.add(link.source);
        collaboratingIndividuals.add(link.target);
    });

    //finds the largest connected component in the network of collaborations
    let largestComponent = new Set();
    network.nodes.forEach(individual => {
        let component = findConnectedComponentDFS(individual.id, network);
        if (component.size > largestComponent.size) {
            largestComponent = component;
        }
    });

    //set of nodes in the largest connected component
    let topIndividuals = network.nodes.filter(d => largestComponent.has(d.id));

    //if the component is too small it adds more nodes among those that have more games
    if (topIndividuals.length < 10) {
        const additionalIndividuals = Array.from(collaboratingIndividuals)
            .map(id => network.nodes.find(ind => ind.id === id))
            .filter(ind => !largestComponent.has(ind.id)) // exclude ones already included
            .sort((a, b) => {
                const aCount = Object.values(gamesToIndividualsMap).filter(ids => ids.includes(a.id)).length;
                const bCount = Object.values(gamesToIndividualsMap).filter(ids => ids.includes(b.id)).length;
                return bCount - aCount;
            })
            .slice(0, 10 - topIndividuals.length);

        topIndividuals = topIndividuals.concat(additionalIndividuals);
    }
    //sorts the nodes by the number of games and takes the top 10
    topIndividuals.sort((a, b) => d3.descending(a.games.length, b.games.length));
    topIndividuals = topIndividuals.slice(0, 10);
    const topIndividualIds = new Set(topIndividuals.map(d => d.id));

    //Filter existing links to keep only those among top 10
    var relevantLinks = network.links.filter(link =>
        topIndividualIds.has(link.source) && topIndividualIds.has(link.target)
    );

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

    //Create the matrix for the chord diagram
    const nodeMap = new Map(topIndividuals.map((node, i) => [node.id, i]));
    const matrix = Array.from({ length: topIndividuals.length }, () =>
        Array.from({ length: topIndividuals.length }, () => 0)
    );

    //Populate the matrix using filtered links
    relevantLinks.forEach(link => {
        const sourceIndex = nodeMap.get(link.source);
        const targetIndex = nodeMap.get(link.target);
        matrix[sourceIndex][targetIndex] = link.weight;
        matrix[targetIndex][sourceIndex] = link.weight;
    });

    return { nodes: topIndividuals, links: relevantLinks, matrix };
}

//DFS standard
function findConnectedComponentDFS(startId, network) {
    let visited = new Set();
    function dfs(currentId) {
        if (visited.has(currentId)) return;
        visited.add(currentId);
        //Find all links where currentId is source or target
        const adjacentLinks = network.links.filter(link => 
            link.source === currentId || link.target === currentId
        );
        //Recursively visit all adjacent nodes
        adjacentLinks.forEach(link => {
            const nextId = link.source === currentId ? link.target : link.source;
            dfs(nextId);
        });
    }
    dfs(startId);
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

    //draws the connections in the chord diagram
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

            //Find the corresponding link and get the shared games
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
    
    //draws the circular arcs
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

    //Adds labels to arcs
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

    //listener for clicks on empty areas of the svg
    outerSvg.on("click", (event) => {
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

//adjustment to prevent screen cutting
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
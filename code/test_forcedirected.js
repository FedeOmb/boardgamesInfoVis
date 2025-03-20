var svg = d3.select("svg"),
  width = +svg.node().getBoundingClientRect().width,
  height = +svg.node().getBoundingClientRect().height;

  //var svg = d3.select("svg")
  //.attr("width", "100%")
  //.attr("height", "100%");

var infoPanelVisible = false;

function updateSize() {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;

  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  simulation.alpha(1).restart();
}

// Aggiungi un event listener per il resize
window.addEventListener("resize", updateSize);

var networkGroup = svg.append("g").attr("class", "network-group");

var zoom = d3.zoom()
  .scaleExtent([0.2, 5]) // limiti di zoom
  .on("zoom", function() {
    networkGroup.attr("transform", d3.event.transform); // Applica la trasformazione al gruppo
  });

svg.call(zoom);

// Funzioni zoom
d3.select("#zoom-in").on("click", function() {
  svg.transition().call(zoom.scaleBy, 1.2);
});
d3.select("#zoom-out").on("click", function() {
  svg.transition().call(zoom.scaleBy, 0.8);
});
d3.select("#zoom-reset").on("click", function() {
  svg.transition().call(zoom.transform, d3.zoomIdentity);
});

// svg objects
var link, node;
// the data - an object with nodes and links
var graph;
var types = [];
var bidirectionalLinks = []

//const radiusScale = d3.scaleLinear().domain([1, 100]).range([13, 3]);

const radiusScale = d3.scaleSqrt().domain([1, 100]).range([15, 5]);

var colorScaleType  = d3.scaleOrdinal(d3.schemeCategory10);

function setScale(data){
  types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  colorScaleType.domain(types);
  console.log(types);
}
//const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

//var nodeColorMap = mapNodesToCliqueColors(cliques)

// Crea la legenda
var legend = d3.select("#color-legend");

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

// load the data
d3.json("data/dataset_converted_cleaned_v2.json", function (error, _graph) {
  if (error) throw error;
  graph = _graph;
  //console.log(graph)
  bidirectionalLinks = filterBidirectionalLinks(graph.links)
  setScale(graph);
  initializeDisplay();
  initializeSimulation();
  addLegend()
});

function addLegend() {
  var allTypes = Array.from(new Set(graph.nodes.flatMap(d => d.type)));

  allTypes.forEach(function(type) {
      var item = legend.append("button")
          .attr("class", "legend-item")
          .attr("data-type", type); // Set the data-type attribute here
      
      item.append("div")
          .attr("class", "legend-color")
          .style("background-color", colorScaleType(type));
      
      item.append("span")
          .text(type);
  });

  // Attach the click event to the legend items
  legend.selectAll(".legend-item").on("click", function() {
    d3.select(this)
    const type = d3.select(this).attr("data-type");
  
    if (activeHull === type) {
      svg.selectAll(".hull").remove();
      activeHull = null;
    } else {
      const hull = computeSingleHull(graph.nodes, type);
      drawSingleHull(svg, hull, type);
      activeHull = type;
    }
  });
}

//////////// FORCE SIMULATION ////////////

// force simulator
var simulation = d3.forceSimulation();

// set up the simulation and event to update locations after each tick
function initializeSimulation() {
  simulation.nodes(graph.nodes);
  initializeForces();
  simulation.on("tick", ticked);
}

// values for all forces
forceProperties = {
  center: {
    x: 0.5,
    y: 0.5,
  },
  charge: {
    enabled: true,
    strength: -70,
    distanceMin: 1,
    distanceMax: 6000,
  },
  collide: {
    enabled: true,
    strength: 0.7,
    iterations: 1,
    radius: 13,
  },
  forceX: {
    enabled: false,
    strength: 0.1,
    x: 0.5,
  },
  forceY: {
    enabled: false,
    strength: 0.1,
    y: 0.5,
  },
  link: {
    enabled: true,
    distance: 50,
    iterations: 1,
  },
};

// add forces to the simulation
function initializeForces() {
  // add forces and associate each with a name
  simulation
    .force("link", d3.forceLink())
    .force("charge", d3.forceManyBody())
    .force("collide", d3.forceCollide())
    .force("center", d3.forceCenter())
    .force("forceX", d3.forceX())
    .force("forceY", d3.forceY());
  // apply properties to each of the forces
  updateForces();
}

// apply new force properties
function updateForces() {
  // get each force by name and update the properties
  simulation
    .force("center")
    .x(width * forceProperties.center.x)
    .y(height * forceProperties.center.y);
  simulation
    .force("charge")
    .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
    .distanceMin(forceProperties.charge.distanceMin)
    .distanceMax(forceProperties.charge.distanceMax);
  simulation
    .force("collide")
    .strength(
      forceProperties.collide.strength * forceProperties.collide.enabled
    )
    .radius(forceProperties.collide.radius)
    .iterations(forceProperties.collide.iterations);
  simulation
    .force("forceX")
    .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
    .x(width * forceProperties.forceX.x);
  simulation
    .force("forceY")
    .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
    .y(height * forceProperties.forceY.y);
  simulation
    .force("link")
    .id(function (d) {
      return d.id;
    })
    .distance(forceProperties.link.distance)
    .iterations(forceProperties.link.iterations)
    .links(forceProperties.link.enabled ? graph.links : []);

  // updates ignored until this is run
  // restarts the simulation (important if simulation has already slowed down)
  simulation.alpha(1).restart();
}

//////////// DISPLAY ////////////

// generate the svg objects and force simulation
function initializeDisplay() {

  networkGroup.append("g").attr("class", "hulls-group");
  // set the data and properties of link lines
  link = networkGroup
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("stroke", "grey") 
    .attr("stroke-width", 1)
    .on("mouseover", mouseEnterEdge) // Add mouseover event listener
    .on("mouseout", mouseLeaveEdge);   // Add mouseout event listener;

  
  // set the data and properties of node circles
  node = networkGroup
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("class", "network-circle")
    .attr("r", (d) => radiusScale(d.rank))
    .attr("fill", d => colorScaleType(d.type[0])) 
    .on("mouseover", handleMouseOver) // Add mouseover event listener
    .on("mouseout", handleMouseOut)
    .on("click", handleNodeClick);   

    // visualize the graph
    updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {
  node
    .attr("r", d => radiusScale(d.rank))
    .attr("fill", d => colorScaleType(d.type[0])) 
    .attr("stroke", "grey")
    .attr("stroke-width", 1);

  link
    .attr("stroke-width", forceProperties.link.enabled ? 1 : 0.5)
    .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

// update the display positions after each simulation tick
function ticked() {
  //let hulls = computeHulls(graph.nodes, types);
  //adjustNodePositions(graph.nodes, hulls);
  //drawHulls(svg, hulls);
  
  link
    .attr("x1", function (d) {
      return d.source.x;
    })
    .attr("y1", function (d) {
      return d.source.y;
    })
    .attr("x2", function (d) {
      return d.target.x;
    })
    .attr("y2", function (d) {
      return d.target.y;
    });

  node
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });

  if (activeHull !== null) {
    const hull = computeSingleHull(graph.nodes, activeHull);
    drawSingleHull(svg, hull, activeHull);
  }
  d3.select("#alpha_value").style("flex-basis", simulation.alpha() * 100 + "%");
}

//////////// UI EVENTS ////////////

// update size-related forces
d3.select(window).on("resize", function () {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;
  updateForces();
});

// convenience function to update everything (run after UI input)
function updateAll() {
  updateForces();
  updateDisplay();
}

/*
function mapNodesToCliqueColors(cliques) {
  //console.log(cliques)
  const nodeColorMap = new Map();

  cliques.forEach((clique, index) => {
    const color = colorScale(index); // Assign a unique color to each clique
    clique.forEach(nodeId => {
      nodeColorMap.set(nodeId, color); // Map each node in the clique to its color
    });
  });

  return nodeColorMap;
}
  */

// Function to handle mouseover node event
function handleMouseOver(d) {
  if(!infoPanelVisible){
    // Highlight the hovered node
    node.each(function(n) {
      d3.select(this).attr("opacity", 0.4);
    })
    link.each(function (l) {
      d3.select(this).attr("opacity", 0.4);
    });
    d3.select(this).attr("stroke", "DarkSlateGrey").attr("stroke-width", 2).attr("opacity", 1);

    // Highlight adjacent nodes
    node.each(function (n) {
      if (isAdjacent(d, n)) {
        d3.select(this).attr("stroke", "DarkSlateGrey").attr("stroke-width", 2).attr("stroke-opacity", 1).attr("opacity", 1);
      }
    });

    // Highlight adjacent links
    link.each(function (l) {
      if (l.source === d || l.target === d) {
        d3.select(this)
          .attr("stroke", "DarkSlateGrey") 
          .attr("stroke-width", 2)
          .attr("stroke-opacity", 1)
          .attr("opacity", 1); 
      }
    });
  }
  tooltip.html(`<strong>${d.rank}°: ${d.title} <br>Type: ${d.type}</strong><br>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");
}

function handleMouseOut(d) {
  if(!infoPanelVisible){
    // Unhighlight the hovered node
    d3.select(this).attr("stroke", "grey").attr("stroke-width", 1);

    // Unhighlight adjacent nodes
    node.each(function (n) {
      if (isAdjacent(d, n)) {
        d3.select(this).attr("stroke", "grey").attr("stroke-width", 1);
      }
    });

    // Unhighlight adjacent links
    link.each(function (l) {
      if (l.source === d || l.target === d) {
        d3.select(this)
          .attr("stroke", "#999") // Revert link color to original
          .attr("stroke-width", 1); // Revert link thickness to original
      }
    });

    resetNetColors()
  }
  tooltip.style("visibility", "hidden");
}

//handle mouseover edge
function mouseEnterEdge(d) {
  // Trova i nodi corrispondenti nel dataset
  const sourceNode = graph.nodes.find(n => n.id === (d.source.id || d.source));
  const targetNode = graph.nodes.find(n => n.id === (d.target.id || d.target));

  // Verifica che entrambi i nodi esistano
  if (!sourceNode || !targetNode) return;

  // Trova le categorie in comune
  const sourceCategories = new Set(sourceNode.categories?.map(c => c.name) || []);
  const targetCategories = new Set(targetNode.categories?.map(c => c.name) || []);
  const commonCategories = [...sourceCategories].filter(c => targetCategories.has(c));

  if(!infoPanelVisible){
    //highlight edge
    d3.select(this)
      .attr("stroke-color", "lime")
      .attr("stroke", "lime")
      .attr("stroke-width", 3);
    //highlight source and target node if any
    d3.selectAll(".network-circle")
      .select(function (data) {
        return data == d.source || data == d.target ? this : null;
      })
      .attr("stroke-width", "3")
      .attr("stroke-color", "lime")
      .attr("stroke", "lime")
      .attr("stroke-width", 3);
  }
  tooltip.transition().duration(200).style("opacity", 0.9);

  edgeData = d3.select(this).datum();
  
  // Mostra la tooltip solo se ci sono categorie in comune
  if (commonCategories.length > 0) {
    if(isBidirectional(sourceNode.id, targetNode.id)){
      tooltip.html(`<strong>${d.source.title} ↔ ${d.target.title}</strong><br>${commonCategories}`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px")
      .style("visibility", "visible");
    }else {
      tooltip.html(`<strong>${d.source.title} → ${d.target.title}</strong><br>${commonCategories}`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px")
      .style("visibility", "visible");
    }
  }else{
      tooltip.html(`<strong>${d.source.title} → ${d.target.title}</strong><br>`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px")
      .style("visibility", "visible");
  }
}

//handle mouseout edge
function mouseLeaveEdge(d) {
  if(!infoPanelVisible){
    d3.select(this).attr("stroke-color", "grey")
    .attr("stroke", "grey")
    .attr("stroke-width", 1);
  
    d3.selectAll(".network-circle")
      .select(function (data) {
        return data == d.source || data == d.target ? this : null;
      })
      .attr("stroke-width", "3")
      .attr("stroke-color", "grey")
      .attr("stroke", "grey")
      .attr("stroke-width", 1);
  }
  tooltip.style("visibility", "hidden");
}

function handleNodeClick(d) {

  infoPanelVisible = true
  d3.select("body").classed("panel-open", true);
  resetNetColors()
  networkGroup.selectAll("line").attr("opacity", 0.4);
  networkGroup.selectAll("circle").attr("opacity", 0.4);

  //scrive le informazioni del gioco
  d3.select("#game-title").text(d.title);
  d3.select("#game-rank").html(`<strong>Rank:</strong> ${d.rank}`);

  d3.select("#node-header").select(".info-row:nth-child(3) .info-value").text(d.year);

  d3.select("#node-header").select(".info-row:nth-child(4) .info-value")
    .text(d.categories.map(c => c.name).join(", "));

  d3.select("#node-header").select(".info-row:nth-child(5) .info-value")
    .text(d.mechanics.map(m => m.name).join(", "));

  d3.select("#node-header").select(".info-row:nth-child(6) .info-value")
    .text(d.type.map(t => t).join(", "));

  d3.select("#node-header").select(".info-row:nth-child(7) .info-value")
    .text(d.designer.map(des => des.name).join(", "));

  //evidenzia i nodi adiacenti
  node.each(function (n) {
    if (isAdjacent(d, n)) {
      d3.select(this).attr("stroke", "DarkSlateGrey").attr("stroke-width", 2).attr("stroke-opacity", 1).attr("opacity", 1);
    }
  });

  // evidenzia i link adiacenti
  link.each(function (l) {
    if (l.source === d || l.target === d) {
      d3.select(this)
        .attr("stroke", "DarkSlateGrey") 
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 1)
        .attr("opacity", 1); 
    }
  });

  d3.select(this)
  .attr("fill", "black")
  .attr("opacity", 1);

  d3.select("#info-panel").style("display", "block");

  // Sposta la rete verso sinistra e ridimensiona il pannello SVG
  if(svg.style("flex-basis") === "100%"){
    svg.transition()
      .duration(200)
      .style("flex-basis", "70%") // Riduci la larghezza del pannello SVG
      .on("end", function() {
        width = +svg.node().getBoundingClientRect().width;
        updateForces();
      });
  }

  // Update the hull if it's visible
  if (activeHull !== null) {
    const hull = computeSingleHull(graph.nodes, activeHull);
    drawSingleHull(svg, hull, activeHull);
  }

  d3.select("#node-details").html(""); // Pulisce il pannello

  d3.select("#info-panel")
  .style("position", "relative"); // Per posizionare il tasto in assoluto all'interno

  d3.select("#close-info-panel").on("click", () => {
    d3.select("#info-panel").style("display", "none");
    infoPanelVisible = false
    d3.select("body").classed("panel-open", false);
    const infoPanel = d3.select("#info-panel");
    infoPanel.style("display", "none");
    svg.style("flex-basis", "100%");
    width = +svg.node().getBoundingClientRect().width;
    updateForces();
    resetNetColors()
    // Redraw the hull if it was visible
    if (activeHull !== null) {
      const hull = computeSingleHull(graph.nodes, activeHull);
      drawSingleHull(svg, hull, activeHull);
    }
  });
  
  d3.select("#chart-content").html(""); // pulizia iniziale

  const neighbors = graph.links
    .filter(l => l.source.id === d.id)
    .map(l => graph.nodes.find(n => n.id === l.target.id));

  const data = [d, ...neighbors];

  d3.select("#chart-selector button[data-chart='minage']").classed("active", true);
  data.sort((a, b) => d3.descending(a.minage, b.minage));
  createMinAgeChart(data);

  d3.selectAll(".chart-btn").on("click", function() {
    const chartType = d3.select(this).attr("data-chart");

    // Rimuove la classe active da tutti i bottoni
    d3.selectAll(".chart-btn").classed("active", false);

    // Aggiunge la classe active solo al bottone cliccato
    d3.select(this).classed("active", true);
    
    // Pulisce l'area dei grafici prima di inserire il nuovo grafico
    d3.select("#chart-content").html("");
  
    if (chartType === "minage") {
      // Ordina per minage decrescente
      data.sort((a, b) => d3.descending(a.minage, b.minage));
      createMinAgeChart(data);
    } else if (chartType === "players") {
      data.sort((a, b) => d3.descending(a.minplayers, b.minplayers));
      createDumbbellChart(data, "minplayers", "maxplayers", "#chart-content", "Players", neighbors.length);
    } else if (chartType === "playtime") {
      data.sort((a, b) => d3.descending(a.minplaytime, b.minplaytime));
      createDumbbellChart(data, "minplaytime", "maxplaytime", "#chart-content", "Playtime (min)", neighbors.length);
    } else if (chartType === "custom") {
      // Placeholder per un grafico custom
      d3.select("#chart-content").append("p").text("Custom chart here!");
    }
  });

  function createMinAgeChart(data) {
    const svgWidth = 500, svgHeight = data.length * 20 + 100;
    const margin = { top: 30, right: 10, bottom: 30, left: 180 };
  
    const ageSvg = d3.select("#chart-content")
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);
    
    ageSvg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .text("Min age")
      .style("font-weight", "bold");
  
    const ageX = d3.scaleLinear()
      //.domain([0, d3.max(data, n => n.minage)])
      .domain([0, getMaxMinAge()])
      .range([margin.left, svgWidth - margin.right]);
  
    const ageY = d3.scaleBand()
      .domain(data.map(n => getShortTitle(n.title)))
      .range([margin.top, svgHeight - margin.bottom])
      .padding(0.1);
  
    ageSvg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", ageX(0))
      .attr("y", n => ageY(getShortTitle(n.title)))
      .attr("width", n => ageX(n.minage) - ageX(0))
      .attr("height", ageY.bandwidth())
      .attr("fill", "steelblue");
  
    ageSvg.append("g")
      .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
      .call(d3.axisBottom(ageX));
  
    ageSvg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(ageY));
  }
  }

  // Dumbbell chart reusable function
  function createDumbbellChart(data, minProp, maxProp, container, title, neighborsLenght) {
    const svgWidth = 500, svgHeight = neighborsLenght * 20 + 100 //200;
    const margin = { top: 30, right: 10, bottom: 30, left: 180 };

    const svg = d3.select(container)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .text(title)
      .style("font-weight", "bold");

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, n => Math.max(n[minProp], n[maxProp]))])
      .range([margin.left, svgWidth - margin.right]);

    const y = d3.scaleBand()
      .domain(data.map(n => getShortTitle(n.title)))
      .range([margin.top, svgHeight - margin.bottom])
      .padding(0.4);

    const lines = svg.selectAll("line")
      .data(data)
      .enter()
      .append("line")
      .attr("x1", d => x(d[minProp]))
      .attr("x2", d => x(d[maxProp]))
      .attr("y1", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
      .attr("y2", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
      .attr("stroke", "gray")
      .attr("stroke-width", "1px");

    svg.selectAll("circle.min")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dumbbell-circle")
      .attr("cx", d => x(d[minProp]))
      .attr("cy", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", "#69b3a2");

    svg.selectAll("circle.max")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dumbbell-circle")
      .attr("cx", d => x(d[maxProp]))
      .attr("cy", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", "#4C4082");

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
  }

  //chiude il pannello info al click su un area vuota
  svg.on("click", function() {
    if (d3.event.target.tagName !== "circle" && infoPanelVisible) {
      infoPanelVisible = false
      d3.select("body").classed("panel-open", false);
      d3.select("#info-panel").style("display", "none");
      const infoPanel = d3.select("#info-panel");
      infoPanel.style("display", "none");
      svg.style("flex-basis", "100%");
      width = +svg.node().getBoundingClientRect().width;
      updateForces();
      resetNetColors()
      // Redraw the hull if it was visible
      if (activeHull !== null) {
        const hull = computeSingleHull(graph.nodes, activeHull);
        drawSingleHull(svg, hull, activeHull);
      }
    }
});

// Helper function to check if two nodes are adjacent
function isAdjacent(source, target) {
  return graph.links.some(link => 
    (link.source === source && link.target === target) || 
    (link.source === target && link.target === source)
  );
}

let activeHull = null;

function computeSingleHull(nodes, type) {
  let points = nodes
    .filter(d => d.type && d.type.includes(type))
    .map(d => [d.x, d.y]);

  if (points.length > 2) {
    return d3.polygonHull(points);
  }
  return null;
}

function drawSingleHull(svg, hull, type) {
  svg.selectAll(".hull").remove();

  if (hull) {
    networkGroup.select(".hulls-group")
      .append("path")
      .attr("class", "hull")
      .attr("d", "M" + hull.join("L") + "Z")
      .style("fill", colorScaleType(type))
      .style("opacity", 0.15)
      .style("pointer-events", "none");
  }
}

function computeHulls(nodes, types) {
  let hulls = {};

  types.forEach(type => {
    let points = nodes
      .filter(d => d.type.includes(type)) // Filtra i nodi con il type specifico
      .map(d => [d.x, d.y]); // Estrai coordinate dei nodi

    if (points.length > 2) {
      hulls[type] = d3.polygonHull(points); // Crea la convex hull
    }
  });

  // Handle nodes with multiple types
  nodes.forEach(node => {
    if (node.type.length > 1) {
      node.type.forEach(type => {
        if (!hulls[type]) {
          hulls[type] = [];
        }
        hulls[type].push([node.x, node.y]);
      });
    }
  });

  // Recompute hulls for types with added points
  Object.keys(hulls).forEach(type => {
    if (hulls[type].length > 2) {
      hulls[type] = d3.polygonHull(hulls[type]);
    }
  });

  return hulls;
}
function drawHulls(svg, hulls) {
  svg.selectAll(".hull").remove(); // Rimuove eventuali hull esistenti
  
  Object.keys(hulls).forEach(type => {
      if (hulls[type]) {
          networkGroup.select(".hulls-group")
              .append("path")
              .attr("class", "hull")
              .attr("d", "M" + hulls[type].join("L") + "Z") // Genera il path della hull
              .style("fill", colorScaleType(type)) // Colore in base al type
              .style("opacity", 0.15)
              .style("pointer-events", "none");
      }
  });
}

function filterBidirectionalLinks(links) {
  const bidirectionalLinks = [];
  const addedPairs = new Set(); // Per tracciare le coppie già aggiunte

  // Creiamo un set per la ricerca rapida dei link
  const linkSet = new Set(links.map(link => `${link.source}-${link.target}`));

  links.forEach(link => {
      const reverseLink = `${link.target}-${link.source}`;
      const pairKey = link.source < link.target ? `${link.source}-${link.target}` : `${link.target}-${link.source}`;

      if (linkSet.has(reverseLink) && !addedPairs.has(pairKey)) {
          bidirectionalLinks.push(link);
          addedPairs.add(pairKey);
      }
  });

  return bidirectionalLinks;
}

function isBidirectional(sourceid, targetid){
  return bidirectionalLinks.some(link => 
    (link.source.id === sourceid && link.target.id === targetid) || 
    (link.source.id === targetid && link.target.id === sourceid)
  );
}

function getShortTitle(title){
  title = String(title)
  if(title.length > 35){
    if(title.includes(":"))
        return title.split(":")[0]
    else if(title.includes("("))
        return title.split("(")[0]
  }else return title
}

function resetNetColors(){
  networkGroup.selectAll("line")
  .attr("opacity", 1)
  .attr("stroke", "grey") 
  .attr("stroke-width", 1);

  networkGroup.selectAll("circle")
  .attr("opacity", 1)
  .attr("fill", d => colorScaleType(d.type[0]))
  .attr("stroke", "grey")
  .attr("stroke-width", 1);
}

function getMaxMinAge(){
  return Math.max(...graph.nodes.map(item => item.minage));
}

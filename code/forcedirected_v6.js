var svg = d3.select("svg"),
width = +svg.node().getBoundingClientRect().width,
height = +svg.node().getBoundingClientRect().height;
svg.append("defs").selectAll("marker")
  .data(["end", "start"])
  .enter().append("marker")
  .attr("id", d => `arrow-${d}`)
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", d => d === "start" ? -10 : 15)  
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-3L6,0L0,3")
  .attr("fill", "grey")
  .attr("transform", d => d === "start" ? "rotate(180, 5, 0)" : null); 

var infoPanelVisible = false;
var labelsVisible = false;
var nodeOpenedFromQuery = false;

function updateSize() {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;

  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  simulation.alpha(0).restart();
  console.log("update size", width, height)
}

var networkGroup = svg.append("g").attr("class", "network-group");

var zoom = d3.zoom()
  .scaleExtent([0.2, 5]) // limiti di zoom
  .on("zoom", function(event) {
    networkGroup.attr("transform", event.transform); // Applica la trasformazione al gruppo
});

svg.call(zoom);

// svg objects
var link, node;
var graph;
var types = [];
var categories
var bidirectionalLinks

//const radiusScale = d3.scaleLinear().domain([1, 100]).range([13, 3]);
const radiusScale = d3.scaleSqrt().domain([1, 100]).range([15, 5]);

//var colorScaleType  = d3.scaleOrdinal(d3.schemeCategory10);
//var customColors = ["#377eb8","#4daf4a","#f781bf","#ffff33","#ff7f00","#e41a1c","#8dd3c7","#b1b1b1"];
//var custColDesaturated = ["#a5bdd3", "#b3d0b3", "#f5cfdc", "#ffffd9", "#ffd6ad", "#e5aaaa", "#cfe5e1", "#e0e0e0"]
var colorScaleType  = d3.scaleOrdinal()

function setScale(data){
  types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  colorScaleType.domain(types).range(d3.schemeTableau10);
  //colorScaleType.domain(types);
}

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
d3.json("data/dataset_converted_cleaned_v2.json").then((data) =>{
  graph = data;
  bidirectionalLinks = filterBidirectionalLinks(graph.links);
  const uniqueLinks = getUniqueLinks(graph.links)
  graph.links = uniqueLinks
  setScale(graph);
  initializeDisplay();
  resetNetColors();
  initializeSimulation();
  addLegend();

  addSearchBar();

});

const titleToIdMap = {};
function addSearchBar(){
  // Mappa titoli → id per ricerca
  graph.nodes.forEach(node => {
    titleToIdMap[node.title] = node.id;

    // Popola datalist per suggerimenti
    d3.select("#game-titles")
      .append("option")
      .attr("value", node.title);
  });

}

function addLegend() {
  var allTypes = Array.from(new Set(graph.nodes.flatMap(d => d.type)));

  allTypes.forEach(function(type) {
      var item = legend.append("button")
          .attr("type", "button")
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
    d3.selectAll(".legend-item").classed("active", false);
    const type = d3.select(this).attr("data-type");
    d3.select(this).classed("active", true);

    if (activeHull === type) {
      d3.select(this).classed("active", false);
      svg.selectAll(".hull").remove();
      activeHull = null;
    } else {
      const hull = computeSingleHull(graph.nodes, type);
      drawSingleHull(svg, hull, type);
      activeHull = type;
    }
  });
  legend.selectAll(".legend-item")
    .on("mouseover", function() {
      if(!infoPanelVisible){
        const type = d3.select(this).attr("data-type");
        node.selectAll("circle, path")
        .attr("opacity", d => d.type.includes(type) ? 1 : 0.4)
        .attr("stroke-width", d => d.type.includes(type) ? 2 : 1)
        .attr("stroke", d => d.type.includes(type) ? "DarkSlateGrey" : "grey");
      } 
    })
    .on("mouseout", () => {
      if(!infoPanelVisible) resetNetColors()
    });
}

//////////// FORCE SIMULATION ////////////

// force simulator
var simulation = d3.forceSimulation();

// set up the simulation and event to update locations after each tick
function initializeSimulation() {
  simulation.alphaDecay(0.02); 
  simulation.alphaMin(0.3);
  simulation.nodes(graph.nodes);
  initializeForces();
  simulation.on("tick", ticked);
  //al termine dell simulazione apre il nodo specificato nell'url se presente
  simulation.on("end", function() { 
    openNodeByQuery();
  });
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
    radius: 14,
  },
  forceX: {
    enabled: true,
    strength: -0.005,
    x: 0.5,
  },
  forceY: {
    enabled: true,
    strength: 0.006,
    y: 0.5,
  },
  link: {
    enabled: true,
    distance: 60,
    iterations: 1,
  },
};

/* ALTRI POSSIBILI PARAMETRI FORZE
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
    radius: 14,
  },
  forceX: {
    enabled: false,
    strength: 0.4,
    x: 0.5,
  },
  forceY: {
    enabled: false,
    strength: 0.4,
    y: 0.5,
  },
  link: {
    enabled: true,
    distance: 60,
    iterations: 1,
  },
};
*/

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

var arc = d3.arc()

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
    .attr("marker-end", "url(#arrow-end)")
    .attr("marker-start", d => d.bidirectional ? "url(#arrow-start)" : null)
    .on("mouseover", mouseEnterEdge)
    .on("mouseout", mouseLeaveEdge);

  // Append a group for each node
  node = networkGroup
    .append("g")
    .attr("class", "nodes")
    .selectAll("g.node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("id", d => d.id)
    .on("mouseover", handleMouseOver) 
    .on("mouseout", handleMouseOut)
    .on("click", handleNodeClick);
  node.selectAll("circle, path")
    .on("click", function(event, d) {
      handleNodeClick.call(this, event, d); 
    });


  var labelsGroup = networkGroup.append("g")
    .attr("class", "labels-group");
  
    nodeLabels = labelsGroup.selectAll(".node-label")
      .data(graph.nodes)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "end")  
      .attr("pointer-events", "none")
      .style("font-size", d => `${Math.max(10, radiusScale(d.rank))}px`)
      /*.style("font-weight", "bold")*/
      .text(d => {
        if (d.rank < 11)
          return getShortTitle(d.title);
      })
      .style("display", "none")
      .attr("dx", d => -radiusScale(d.rank)) 
      .attr("dy", "0.35em");  

  // visualize the graph
  updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {

  node.each(function(d) {

    const nodeGroup = d3.select(this);

    arc.innerRadius(0)
      .outerRadius(radiusScale(d.rank))
      .startAngle(0)
      .endAngle(Math.PI); // Half-circle

    if (d.type.length === 1) {
        // If the node has one type, append a full circle
        nodeGroup.append("circle")
            .attr("class", "network-circle")
            .attr("r", radiusScale(d.rank))
            .attr("fill", colorScaleType(d.type[0]));
    } else if (d.type.length === 2) {
        // If the node has two types, append two half-circles (arcs)
        nodeGroup.append("path")
            .attr("d", arc)
            .attr("fill", colorScaleType(d.type[0]))
            .attr("transform", "rotate(0)"); // First half-circle

        nodeGroup.append("path")
            .attr("d", arc)
            .attr("fill", colorScaleType(d.type[1]))
            .attr("transform", "rotate(180)"); // Second half-circle, rotated 180 degrees
    }
  }); 

  link
    .attr("stroke-width", forceProperties.link.enabled ? 1 : 0.5)
    .attr("opacity", forceProperties.link.enabled ? 1 : 0)
    .attr("marker-end", "url(#arrow-end)")
    .attr("marker-start", d => d.bidirectional ? "url(#arrow-start)" : null);
}

// update the display positions after each simulation tick
function ticked() {

  /*link
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
    });*/
    link
      .attr("x1", d => adjustLinkStart(d.source, d.target, radiusScale(d.source.rank)).x)
      .attr("y1", d => adjustLinkStart(d.source, d.target, radiusScale(d.source.rank)).y)
      .attr("x2", d => adjustLinkEnd(d.source, d.target, radiusScale(d.target.rank)).x)
      .attr("y2", d => adjustLinkEnd(d.source, d.target, radiusScale(d.target.rank)).y)
      .attr("marker-start", d => d.bidirectional ? "url(#arrow-start)" : null); 

  node
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });
  node.attr("transform", d => `translate(${d.x},${d.y})`);

  if (activeHull !== null) {
    const hull = computeSingleHull(graph.nodes, activeHull);
    drawSingleHull(svg, hull, activeHull);
  }
  d3.select("#alpha_value").style("flex-basis", simulation.alpha() * 100 + "%");

  nodeLabels
    .attr("x", d => d.x)  
    .attr("y", d => d.y);
}

function adjustLinkStart(source, target, radius) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: source.x, y: source.y };

  const offsetX = (dx * radius) / distance;
  const offsetY = (dy * radius) / distance;

  return { x: source.x + offsetX, y: source.y + offsetY };
}

function adjustLinkEnd(source, target, radius) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: target.x, y: target.y };

  const offsetX = (dx * radius) / distance;
  const offsetY = (dy * radius) / distance;

  return { x: target.x - offsetX, y: target.y - offsetY };
}

function adjustLinkMid(source, target, radius) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };

  const offsetX = (dx * radius) / distance;
  const offsetY = (dy * radius) / distance;

  return { x: (source.x + target.x) / 2 - offsetX, y: (source.y + target.y) / 2 - offsetY };
}

// update size-related forces
window.addEventListener("resize", () => {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;
  updateSize();
  updateForces();
});

function updateTooltipPosition() {
  tooltip
    .style("left", (event.pageX - 40) + "px")
    .style("top", (event.pageY + 10) + "px");
};

// Helper function to check if two nodes are adjacent
function isAdjacent(source, target) {
  return graph.links.some(link => 
    (link.source === source && link.target === target) /*|| 
    (link.source === target && link.target === source)*/
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
      .style("opacity", 0.35)
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
  const bidirectionalSet = new Set();
  const bidirectionalLinks = [];

  links.forEach(link => {
    const sourceID = link.source.id !== undefined ? link.source.id : link.source;
    const targetID = link.target.id !== undefined ? link.target.id : link.target;

    const key = `${sourceID}-${targetID}`;
    const reverseKey = `${targetID}-${sourceID}`;

    if (bidirectionalSet.has(reverseKey)) {
      bidirectionalLinks.push({ source: sourceID, target: targetID });
    }
    bidirectionalSet.add(key);
  });

  return new Set(bidirectionalLinks.map(l => `${l.source}-${l.target}`));
}

function isBidirectional(sourceid, targetid) {
  return bidirectionalLinks.has(`${sourceid}-${targetid}`) || bidirectionalLinks.has(`${targetid}-${sourceid}`);
}

function getShortTitle(title){
  title = String(title)
  if(title.includes(":"))
      return title.split(":")[0]
  else if(title.includes("("))
      return title.split("(")[0]
  else return title
}

function getShortCatName(catName){
  if(String(catName).length > 12)
    return String(catName).split("/").join("\n")
  else return catName
}

function resetNetColors() {
  // Reset link styles
  networkGroup.selectAll("line")
    .attr("opacity", 1)
    .attr("stroke", "grey")
    .attr("stroke-width", 1)
    .attr("marker-end", "url(#arrow-end)")
    .attr("marker-start", d => isBidirectional(d.source.id, d.target.id) ? "url(#arrow-start)" : null);

  // Reset node styles
  networkGroup.selectAll(".node")
    .selectAll("circle, path") // Target both circle and path elements
    .attr("opacity", 1)
    .attr("stroke", "grey")
    .attr("stroke-width", 1);

  // Reset fill for circles and paths based on node type
  networkGroup.selectAll(".node").each(function(d) {
    const nodeGroup = d3.select(this);

    if (d.type.length === 1) {
      // For nodes with one type, set fill for the circle
      nodeGroup.select("circle")
        .attr("fill", colorScaleType(d.type[0]));
    } else if (d.type.length === 2) {
      // For nodes with two types, set fill for each path
      nodeGroup.selectAll("path")
        .attr("fill", (_, i) => colorScaleType(d.type[i]));
    }
  });
}

function getMaxMinAge(){
  return Math.max(...graph.nodes.map(item => item.minage));
}

function getUniqueLinks(links) {
  const uniqueLinks = [];
  const processedPairs = new Set();

  links.forEach(link => {
    const sourceId = link.source.id !== undefined ? link.source.id : link.source;
    const targetId = link.target.id !== undefined ? link.target.id : link.target;
    const pairKey = `${sourceId}-${targetId}`;
    const reversePairKey = `${targetId}-${sourceId}`;

    if (processedPairs.has(pairKey) || processedPairs.has(reversePairKey)) {
      return;
    }

    // Controlliamo se esiste un link inverso
    const isBidirectional = links.some(l => 
      (l.source.id !== undefined ? l.source.id : l.source) === targetId && 
      (l.target.id !== undefined ? l.target.id : l.target) === sourceId
    );

    if (isBidirectional) {
      uniqueLinks.push({ ...link, bidirectional: true });
      processedPairs.add(pairKey);
      processedPairs.add(reversePairKey);
    } else {
      uniqueLinks.push({ ...link, bidirectional: false });
      processedPairs.add(pairKey);
    }
  });

  return uniqueLinks;
}

function openNodeById(nodeId) {
  const targetNode = graph.nodes.find(n => n.id === nodeId);
  if (targetNode) {
    const nodeElement = d3.selectAll(".node").filter(d => d.id === nodeId).node();
    if (nodeElement) {
      console.log("opened node",nodeId)
      handleNodeClick.call(nodeElement, null, targetNode);
    }
  } else {
    console.error(`Node with ID ${nodeId} not found.`);
  }
}

function openNodeByQuery(){

    if(!nodeOpenedFromQuery){
      // Controlla se c'è un parametro gameId nell'URL
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    console.log("read parameter",gameId)
    
    if (gameId) {
      openNodeById(parseInt(gameId)); 
      //setTimeout(() => openNodeById(parseInt(gameId)), 1000);
      nodeOpenedFromQuery = true;
    }
  }
}

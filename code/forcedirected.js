var svg = d3.select("svg"),
width = +svg.node().getBoundingClientRect().width,
height = +svg.node().getBoundingClientRect().height;
//append link arrows
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

  simulation.force("center", d3.forceCenter(width / 2, (height / 2) - 60));
  simulation.alpha(0).restart();
}

var networkGroup = svg.append("g").attr("class", "network-group");

var zoomLevel = 1
var zoom = d3.zoom()
  .scaleExtent([0.2, 5]) //zoom range
  .on("zoom", function(event) {
    zoomLevel = event.transform.k
    networkGroup.attr("transform", event.transform); 
    nodeLabels
      .style("font-size", d => 
        `${Math.max(10, radiusScale(d.rank) / event.transform.k)}px`
      );
    //show labels with zooming
    if(!infoPanelVisible)
      nodeLabels
        .text(d => {
          if(zoomLevel <= 1){
            if(d.rank < 16)
              return getShortTitle(d.title)
            else return ""
          }else if(zoomLevel > 1 && zoomLevel <= 1.2){
            if(d.rank < 36)
              return getShortTitle(d.title)
            else return ""
          }else if(zoomLevel > 1.2 && zoomLevel <= 1.44){
            if(d.rank < 51)
              return getShortTitle(d.title)
            else return ""
          }else if(zoomLevel > 1.44 && zoomLevel <= 1.728){
            if(d.rank < 76)
              return getShortTitle(d.title)
            else return ""
          }else if(zoomLevel > 1.728)
              return getShortTitle(d.title)
      })
});

svg.call(zoom);

var link, node;
var graph;
var types = [];
var categories
var bidirectionalLinks

//node radius proportional with ranking
const radiusScale = d3.scaleSqrt().domain([1, 100]).range([15, 5]);

var colorScaleType  = d3.scaleOrdinal()

function setScale(data){
  types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  colorScaleType.domain(types).range(d3.schemeTableau10);
}

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
  // Maps titles to id 
  graph.nodes.forEach(node => {
    titleToIdMap[node.title] = node.id

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
          .attr("data-type", type); 
      
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

// FORCE SIMULATION

var simulation = d3.forceSimulation();

// set up the simulation and event to update locations after each tick
function initializeSimulation() {
  simulation.alphaDecay(0.02); 
  simulation.alphaMin(0.3);
  simulation.nodes(graph.nodes);
  initializeForces();
  simulation.on("tick", ticked);
  //at the end of the simulation opens the node specified in the url if present
  simulation.on("end", function() { 
    openNodeByQuery();
  });
}

// FORCE PROPERTIES
forceProperties = {
  center: {
    x: 0.5,
    y: 0.5,
  },
  charge: {
    strength: -70,
    distanceMin: 1,
    distanceMax: 6000,
  },
  collide: {
    strength: 0.7,
    iterations: 1,
    radius: 16,
  },
  forceX: {
    enabled: true,
    strength: -0.1,
    x: 0.5,
  },
  forceY: {
    strength: -0.05,
    y: 0.5,
  },
  link: {
    distance: 60,
    iterations: 1,
  },
  cluster: {
    strength: 0.15,
  },
  labelCollision: {
    strength: 0.7,
    radius: d => Math.max(10, radiusScale(d.rank)) * 2 
  },
}

function forceCluster(alpha) {
  const strength = 0.15;
  const padding = 250;
  let nodes;
  let centers = {};

  function force(alpha) {
    nodes.forEach(d => {
      d.type.forEach(nodeType => {
        if (centers[nodeType]) {
          // Attrai il nodo verso il centro del suo gruppo
          d.vx += (centers[nodeType].x - d.x) * strength * alpha;
          d.vy += (centers[nodeType].y - d.y) * strength * alpha;
        }
      });
    });
  }

  force.initialize = function(_nodes) {
    nodes = _nodes;
    // Calcola i centri per ogni tipo
    const types = Array.from(new Set(nodes.flatMap(d => d.type)));
    types.forEach((type, i) => {
      const angle = (i / types.length) * 2 * Math.PI;
      centers[type] = {
        x: (width/2) + Math.cos(angle) * padding,
        y: (height/2) + Math.sin(angle) * padding
      };
    });
  }

  return force;
}

// add forces to the simulation and set their properties
function initializeForces() {

  simulation.force("link", d3.forceLink()
      .id(function (d) {
        return d.id;
      })
      .distance(forceProperties.link.distance)
      .iterations(forceProperties.link.iterations)
      .links(graph.links)
  );
  simulation.force("charge", d3.forceManyBody()
    .strength(forceProperties.charge.strength)
    .distanceMin(forceProperties.charge.distanceMin)
    .distanceMax(forceProperties.charge.distanceMax)
  );
  simulation.force("collide", d3.forceCollide()
  .strength(forceProperties.collide.strength)
  .radius(forceProperties.collide.radius)
  .iterations(forceProperties.collide.iterations)
);
  simulation.force("center", d3.forceCenter()
  .x(width * forceProperties.center.x)
  .y((height * forceProperties.center.y) - 60)
);
  simulation.force("forceX", d3.forceX()
  .strength(forceProperties.forceX.strength)
  .x(width * forceProperties.forceX.x)
);
  simulation.force("forceY", d3.forceY()
  .strength(forceProperties.forceY.strength)
  .y(height * forceProperties.forceY.y)
);
  simulation.force("cluster", forceCluster());
  simulation.force("labelCollision", d3.forceCollide()
      .strength(forceProperties.labelCollision.strength)
      .radius(forceProperties.labelCollision.radius)
    );

simulation.alpha(1).restart();
}

// DISPLAY

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

    //add drag event to nodes
    node.call(d3.drag()
      .on("start", function(event, d) {
      })
      .on("drag", function(event, d) {
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
        
        //Adjust link and label position  
        link
          .filter(l => l.source === d || l.target === d)
          .attr("x1", d => adjustLinkStart(d.source, d.target, radiusScale(d.source.rank)).x)
          .attr("y1", d => adjustLinkStart(d.source, d.target, radiusScale(d.source.rank)).y)
          .attr("x2", d => adjustLinkEnd(d.source, d.target, radiusScale(d.target.rank)).x)
          .attr("y2", d => adjustLinkEnd(d.source, d.target, radiusScale(d.target.rank)).y);
    
        nodeLabels
          .filter(n => n.id === d.id)
          .each(function(d) {
            d.labelX = d.x;
            d.labelY = d.y + radiusScale(d.rank) + 5;
          }
        );

          nodeLabels
          .attr("x", d => {
            const angle = Math.atan2(d.y - height/2, d.x - width/2);
            const offset = radiusScale(d.rank) + 10;
            return d.labelX = d.x + Math.cos(angle) * offset;
          })
          .attr("y", d => {
            const angle = Math.atan2(d.y - height/2, d.x - width/2);
            const offset = radiusScale(d.rank) + 10;
            return d.labelY = d.y + Math.sin(angle) * offset;
          });
  
      })
    );  

  var labelsGroup = networkGroup.append("g")
    .attr("class", "labels-group");
  
  nodeLabels = labelsGroup.selectAll(".node-label")
    .data(graph.nodes)
    .enter()
    .append("text")
    .attr("class", "node-label")
    .attr("text-anchor", "middle")  
    .attr("pointer-events", "none")
    .style("font-size", d => `${Math.max(10, radiusScale(d.rank))}px`)
    .style("stroke", "white") 
    .style("stroke-width", "3px") 
    .style("paint-order", "stroke") 
    .style("stroke-linejoin", "round")
    .style("stroke-opacity", 0.5)
    .text(d => d.rank<16 ? getShortTitle(d.title) : "")
    .style("display", "none")
    .attr("dx", 0)  
    .attr("dy", "0.35em")
    .each(function(d) {
      d.labelX = d.x;
      d.labelY = d.y + radiusScale(d.rank) + 5; 
    });

  // visualize the graph
  updateDisplay();
}

// update nodes and links attributes
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
    .attr("stroke-width", 1)
    .attr("opacity", 1)
    .attr("marker-end", "url(#arrow-end)")
    .attr("marker-start", d => d.bidirectional ? "url(#arrow-start)" : null);
}

// update the display positions after each simulation tick
function ticked() {
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

  // Update label positions with collision avoidance
  nodeLabels
    .attr("x", d => {
      // Try to find a position with least overlap
      const angle = Math.atan2(d.y - height/2, d.x - width/2);
      const offset = radiusScale(d.rank) + 10;
      return d.labelX = d.x + Math.cos(angle) * offset;
    })
    .attr("y", d => {
      const angle = Math.atan2(d.y - height/2, d.x - width/2);
      const offset = radiusScale(d.rank) + 10;
      return d.labelY = d.y + Math.sin(angle) * offset;
    });

  nodeLabels
    .each(function(d) {
      d.labelX = d.x;
      d.labelY = d.y + radiusScale(d.rank) + 5;
    })
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
});

// Helper function to check if two nodes are adjacent
function isAdjacent(source, target) {
  return graph.links.some(link => (link.source === source && link.target === target) );
}


//compute and draw hulls

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
      .filter(d => d.type.includes(type)) 
      .map(d => [d.x, d.y]); 

    if (points.length > 2) {
      hulls[type] = d3.polygonHull(points); 
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
  svg.selectAll(".hull").remove();  

  Object.keys(hulls).forEach(type => {
    if (hulls[type]) {
      networkGroup.select(".hulls-group")
        .append("path")
        .attr("class", "hull")
        .attr("d", "M" + hulls[type].join("L") + "Z") 
        .style("fill", colorScaleType(type)) 
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
      return title.split(":")[0]+"..."
  else if(title.includes("("))
      return title.split("(")[0]+"..."
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
    .attr("stroke", "#606060")
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

    //check if there is a reverse link
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
      handleNodeClick.call(nodeElement, null, targetNode);
    }
  } else {
    console.error(`Node with ID ${nodeId} not found.`);
  }
}

function openNodeByQuery(){

    if(!nodeOpenedFromQuery){
      //Check if there is a gameId parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    
    if (gameId) {
      openNodeById(parseInt(gameId)); 
      nodeOpenedFromQuery = true;
    }
  }
}

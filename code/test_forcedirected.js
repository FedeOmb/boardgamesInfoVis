
var svg = d3.select("svg"),
  width = +svg.node().getBoundingClientRect().width,
  height = +svg.node().getBoundingClientRect().height;

// svg objects
var link, node;
// the data - an object with nodes and links
var graph;
var types = [];
var bidirectionalLinks = []

const radiusScale = d3.scaleLinear()
  .domain([1, 100]) // Input data range
  .range([13, 3]);


var colorScaleType  = d3.scaleOrdinal(d3.schemeCategory10);

function setScale(data){
  types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  colorScaleType.domain(types);
  console.log(types);
}
//const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

//var nodeColorMap = mapNodesToCliqueColors(cliques)

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("visibility", "hidden");

// load the data
d3.json("data/dataset_converted_cleaned_v2.json", function (error, _graph) {
//  d3.json("data/dataset_cleaned_bidirectional_100.json", function (error, _graph) {
  if (error) throw error;
  graph = _graph;
  //console.log(graph)
  bidirectionalLinks = filterBidirectionalLinks(graph.links)
  setScale(graph);
  initializeDisplay();
  initializeSimulation();
});

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

  svg.append("g").attr("class", "hulls-group");
  // set the data and properties of link lines
  link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("stroke", "grey") // Explicitly set the default stroke color for links
    .attr("stroke-width", 1)
    .on("mouseover", mouseEnterEdge) // Add mouseover event listener
    .on("mouseout", mouseLeaveEdge);   // Add mouseout event listener;

  
  // set the data and properties of node circles
  node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("r", (d) => radiusScale(d.rank))
    .attr("fill", d => colorScaleType(d.type[0])) // Default to gray if no clique color
    .on("mouseover", handleMouseOver) // Add mouseover event listener
    .on("mouseout", handleMouseOut);   // Add mouseout event listener

    // visualize the graph
    updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {
  node
    .attr("r", d => radiusScale(d.rank))
    .attr("fill", d => colorScaleType(d.type[0])) // Default to gray if no clique color
    .attr("stroke", "grey")
    .attr("stroke-width", 1);

  link
    .attr("stroke-width", forceProperties.link.enabled ? 1 : 0.5)
    .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

// update the display positions after each simulation tick
function ticked() {
  let hulls = computeHulls(graph.nodes, types);
  //adjustNodePositions(graph.nodes, hulls);
  drawHulls(svg, hulls);
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

// Function to handle mouseover node event
function handleMouseOver(d) {
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

  tooltip.html(`<strong>${d.rank}°: ${d.title} <br>Type: ${d.type}</strong><br>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");
}

// Function to handle mouseout node event
function handleMouseOut(d) {
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

  node.each(function(n) {
    d3.select(this).attr("opacity", 1);
  })
  link.each(function (l) {
    d3.select(this).attr("opacity", 1);
  });

  tooltip.style("visibility", "hidden");
}

//handle mouseover edge
function mouseEnterEdge(d) {
  //highlight edge
  d3.select(this)
  .attr("stroke-color", "darkorange")
  .attr("stroke", "darkorange")
  .attr("stroke-width", 3);

  // Trova i nodi corrispondenti nel dataset
  const sourceNode = graph.nodes.find(n => n.id === (d.source.id || d.source));
  const targetNode = graph.nodes.find(n => n.id === (d.target.id || d.target));

  // Verifica che entrambi i nodi esistano
  if (!sourceNode || !targetNode) return;

  // Trova le categorie in comune
  const sourceCategories = new Set(sourceNode.categories?.map(c => c.name) || []);
  const targetCategories = new Set(targetNode.categories?.map(c => c.name) || []);
  const commonCategories = [...sourceCategories].filter(c => targetCategories.has(c));

  //highlight source and target node if any
  d3.selectAll("circle")
    .select(function (data) {
      return data == d.source || data == d.target ? this : null;
    })
    .attr("stroke-width", "3")
    .attr("stroke-color", "darkorange")
    .attr("stroke", "darkorange")
    .attr("stroke-width", 3);

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
  d3.select(this).attr("stroke-color", "grey")
    .attr("stroke", "grey")
    .attr("stroke-width", 1);
  
    d3.selectAll("circle")
      .select(function (data) {
        return data == d.source || data == d.target ? this : null;
      })
      .attr("stroke-width", "3")
      .attr("stroke-color", "grey")
      .attr("stroke", "grey")
      .attr("stroke-width", 1);
  
      tooltip.style("visibility", "hidden");
}

// Helper function to check if two nodes are adjacent
function isAdjacent(source, target) {
  return graph.links.some(link => 
    (link.source === source && link.target === target) || 
    (link.source === target && link.target === source)
  );
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
          svg.select(".hulls-group")
              .append("path")
              .attr("class", "hull")
              .attr("d", "M" + hulls[type].join("L") + "Z") // Genera il path della hull
              .style("fill", colorScaleType(type)) // Colore in base al type
              .style("opacity", 0.15)
              .style("pointer-events", "none");
      }
  });
}
function adjustNodePositions(nodes, hulls) {
  nodes.forEach(node => {
      if (node.type.length > 1) {
          let centers = node.type
              .filter(type => hulls[type])
              .map(type => d3.polygonCentroid(hulls[type])); // Trova i centroidi dei type
          
          if (centers.length > 0) {
              node.x = d3.mean(centers, d => d[0]); // Media delle x
              node.y = d3.mean(centers, d => d[1]); // Media delle y
          }
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



var svg = d3.select("svg"),
  width = +svg.node().getBoundingClientRect().width,
  height = +svg.node().getBoundingClientRect().height;

// svg objects
var link, node;
// the data - an object with nodes and links
var graph;

const radiusScale = d3.scaleLinear()
  .domain([1, 100]) // Input data range
  .range([13, 3]);

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

var nodeColorMap = mapNodesToCliqueColors(cliques)

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
d3.json("data/dataset_converted_cleaned.json", function (error, _graph) {
  if (error) throw error;
  graph = _graph;
  //console.log(graph)
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
  // set the data and properties of link lines
  link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("stroke", "#999") // Explicitly set the default stroke color for links
    .attr("stroke-width", 1);

  // set the data and properties of node circles
  node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("r", (d) => radiusScale(d.rank))
    .attr("fill", d => nodeColorMap.get(d.id) || "gray") // Default to gray if no clique color
    .on("mouseover", handleMouseOver) // Add mouseover event listener
    .on("mouseout", handleMouseOut);   // Add mouseout event listener

  // visualize the graph
  updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {
  node
    .attr("r", d => radiusScale(d.rank))
    .attr("fill", d => nodeColorMap.get(d.id) || "gray") // Default to gray if no clique color
    .attr("stroke", "grey")
    .attr(
      "stroke-width", 1);

  link
    .attr("stroke-width", forceProperties.link.enabled ? 1 : 0.5)
    .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

// update the display positions after each simulation tick
function ticked() {
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

// Function to handle mouseover event
function handleMouseOver(d) {
  // Highlight the hovered node
  d3.select(this).attr("stroke", "black").attr("stroke-width", 2);

  // Highlight adjacent nodes
  node.each(function (n) {
    if (isAdjacent(d, n)) {
      d3.select(this).attr("stroke", "black").attr("stroke-width", 2).attr("stroke-opacity", 1);
    }
  });

  // Highlight adjacent links
  link.each(function (l) {
    if (l.source === d || l.target === d) {
      d3.select(this)
        .attr("stroke", "black") // Change link color to black
        .attr("stroke-width", 3)
        .attr("stroke-opacity", 1); // Increase link thickness
    }
  });

  tooltip.html(`<strong>${d.rank}°: ${d.title}</strong><br>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");
}

// Function to handle mouseout event
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

  tooltip.style("visibility", "hidden");
}

// Helper function to check if two nodes are adjacent
function isAdjacent(source, target) {
  return graph.links.some(link => 
    (link.source === source && link.target === target) || 
    (link.source === target && link.target === source)
  );
}

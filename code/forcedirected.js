var svg = d3.select("svg"),
width = +svg.node().getBoundingClientRect().width,
height = +svg.node().getBoundingClientRect().height;

var infoPanelVisible = false;

function updateSize() {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;

  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  simulation.alpha(0).restart();
}

var networkGroup = svg.append("g").attr("class", "network-group");

var zoom = d3.zoom()
  .scaleExtent([0.2, 5]) // limiti di zoom
  .on("zoom", function() {
    networkGroup.attr("transform", d3.event.transform); // Applica la trasformazione al gruppo
});

svg.call(zoom);

// svg objects
var link, node;
// the data - an object with nodes and links
var graph;
var types = [];
var categories
var bidirectionalLinks = []

//const radiusScale = d3.scaleLinear().domain([1, 100]).range([13, 3]);
const radiusScale = d3.scaleSqrt().domain([1, 100]).range([15, 5]);

//var colorScaleType  = d3.scaleOrdinal(d3.schemeCategory10);
var customColors = ["#377eb8","#4daf4a","#f781bf","#ffff33","#ff7f00","#e41a1c","#8dd3c7","#b1b1b1"];
var custColDesaturated = ["#a5bdd3", "#b3d0b3", "#f5cfdc", "#ffffd9", "#ffd6ad", "#e5aaaa", "#cfe5e1", "#e0e0e0"]
var colorScaleType  = d3.scaleOrdinal()

function setScale(data){
  types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  colorScaleType.domain(types).range(customColors);
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
d3.json("data/dataset_converted_cleaned_v2.json", function (error, _graph) {
  if (error) throw error;
  graph = _graph;

  bidirectionalLinks = filterBidirectionalLinks(graph.links);
  setScale(graph);
  initializeDisplay();
  resetNetColors();
  initializeSimulation();
  addLegend();
});

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
    .on("mouseover", mouseEnterEdge) // Add mouseover event listener
    .on("mouseout", mouseLeaveEdge);   // Add mouseout event listener;

  // Append a group for each node
  node = networkGroup
    .append("g")
    .attr("class", "nodes")
    .selectAll("g.node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .on("mouseover", handleMouseOver) 
    .on("mouseout", handleMouseOut)
    .on("click", handleNodeClick);
  node.selectAll("circle, path")
    .on("click", function(event, d) {
      handleNodeClick.call(this, event, d); 
    });

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
  node.attr("transform", d => `translate(${d.x},${d.y})`);

  if (activeHull !== null) {
    const hull = computeSingleHull(graph.nodes, activeHull);
    drawSingleHull(svg, hull, activeHull);
  }
  d3.select("#alpha_value").style("flex-basis", simulation.alpha() * 100 + "%");
}

// update size-related forces
window.addEventListener("resize", () => {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;
  updateSize();
  updateForces();
});

// convenience function to update everything (run after UI input)
function updateAll() {
  updateForces();
  updateDisplay();
}

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

function createCategoriesChart(data) {
  // Extract categories
  let categories = data.flatMap(d => d.categories || []);

  // Count occurrences
  const counts = d3.nest()
    .key(c => c.name)
    .rollup(v => v.length)
    .entries(categories)
    .map(d => ({ name: d.key, count: d.value }));

  counts.sort((a, b) => d3.descending(a.count, b.count));

  // Define dimensions and margins
  const margin = { top: 30, right: 20, bottom: 30, left: 180 };
  const width = 500 - margin.left - margin.right; // Chart width (excluding margins)
  const height = categories.length * 10 + 100 - margin.top - margin.bottom; // Chart height (excluding margins)

  // Create SVG container
  const svg = d3.select("#chart-content")
    .append("svg")
    .attr("width", width + margin.left + margin.right) // Total SVG width
    .attr("height", height + margin.top + margin.bottom) // Total SVG height
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`); // Offset chart area by margins

  // Add the title
  svg.append("text")
    .attr("x", width / 2) // Center the title horizontally
    .attr("y", 0 - (margin.top / 2)) // Position the title above the chart
    .attr("text-anchor", "middle")
    .text("Categories frequency")
    .style("font-weight", "bold");

  // Define scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count)]) // Domain based on counts
    .range([0, width]); // Range within the chart area

  const y = d3.scaleBand()
    .domain(counts.map(d => d.name)) // Domain based on category names
    .rangeRound([0, height]) // Range within the chart area
    .padding(0.1);

  // Add bars
  svg.selectAll(".bar")
    .data(counts)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => y(d.name))
    .attr("width", d => x(d.count))
    .attr("height", y.bandwidth())
    .attr("fill", "steelblue");

  // Add labels (counts) on the bars
  svg.selectAll(".label")
    .data(counts)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => x(d.count) + 5) // Position text at the end of the bar
    .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4) // Center text vertically
    .text(d => d.count);

  // Add x-axis
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`) // Position x-axis at the bottom
    .call(d3.axisBottom(x).ticks(2));

  // Add y-axis
  svg.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y))
    .selectAll(".tick text")
    .each(function(d) {
      const self = d3.select(this);
      const name = String(d);

      if (name.length > 20) {
        const lines = name.split("/");
        self.text(null);
        lines.forEach(function(line, i) {
          self.append("tspan")
            .text(line)
            .attr("x", -7)
            .attr("dy", i === 0 ? "0em" : "1.1em");
        });
      }
    });
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
  if (d3.event.target.tagName !== "circle" && d3.event.target.tagName !== "path" && infoPanelVisible) {
    infoPanelVisible = false
    d3.select("body").classed("panel-open", false);
    d3.select("#info-panel").style("display", "none");
    const infoPanel = d3.select("#info-panel");
    infoPanel.style("display", "none");
    svg.style("flex-basis", "100%");
    width = +svg.node().getBoundingClientRect().width;
    updateSize()
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
    .attr("stroke-width", 1);

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
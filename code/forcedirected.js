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
var graph;
var types = [];
var categories
var bidirectionalLinks

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
  const uniqueLinks = getUniqueLinks(graph.links)
  graph.links = uniqueLinks
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
  simulation.alphaDecay(0.02); 
  simulation.alphaMin(0.3);
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
    .on("mouseover", handleMouseOver) 
    .on("mouseout", handleMouseOut)
    .on("click", handleNodeClick);
  node.selectAll("circle, path")
    .on("click", function(event, d) {
      handleNodeClick.call(this, event, d); 
    });

  node.append("text")
    .attr("class", "node-label")
    .attr("text-anchor", d => d.rank % 5 === 0 ? "start" : "end")
    .attr("dx", d => {
      const radius = radiusScale(d.rank);
      return d.rank % 5 === 0 ? (radius) : -(radius);
    })
    .attr("dy", 4)
    .style("font-size", d => `${Math.max(10, radiusScale(d.rank))}px`) 
    .text(d => {
      if(d.rank < 26)
        return getShortTitle(d.title)
    })
    .style("display", "none");

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

// convenience function to update everything (run after UI input)
function updateAll() {
  updateForces();
  updateDisplay();
}

function createMinAgeChart(data) {
  const svgWidth = d3.select("#chart-content").node().getBoundingClientRect().width - 10
  const svgHeight = data.length * 20 + 100;
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
    .domain([0, getMaxMinAge() * 1.1])
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

    ageSvg.selectAll(".label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => ageX(d.minage) - 5) // Sposta leggermente a sinistra
    .attr("y", d => ageY(getShortTitle(d.title)) + ageY.bandwidth() / 2 + 4) // Centra verticalmente
    .attr("fill", "white")
    .attr("text-anchor", "end") // Allinea a destra
    .attr("font-weight", "bold")
    .text(d => d.minage);

  ageSvg.append("g")
    .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
    .call(d3.axisBottom(ageX).ticks(5).tickFormat(d3.format(".0f")));

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
  const width = d3.select("#chart-content").node().getBoundingClientRect().width - 15;
  const height = counts.length * 20 + 100; 
  const margin = { top: 30, right: 10, bottom: 30, left: 180 };

  const svg = d3.select("#chart-content")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text("Categories frequency")
    .style("font-weight", "bold");

  // Define scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count) * 1.1]) 
    .range([margin.left, width - margin.right]); 

  const y = d3.scaleBand()
    .domain(counts.map(d => d.name)) 
    .range([margin.top, height - margin.bottom])
    .padding(0.1);

  svg.selectAll("rect")
    .data(counts)
    .enter()
    .append("rect")
    .attr("x", margin.left) // Deve partire da margin.left
    .attr("y", d => y(d.name))
    .attr("width", d => x(d.count) - margin.left) // Modificato per partire dal margine sinistro
    .attr("height", y.bandwidth())
    .attr("fill", "steelblue")
    .on("mouseover", function(event, n) {
      var games = data
      .filter(d =>  d.categories.some(cat => cat.name === counts[n]["name"]))
      .map(d => d.title);
      tooltip
        .html(`${games}`)
        .style("visibility", "visible");
    })
    .on("mousemove", function(event) {
      updateTooltipPosition();
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  svg.selectAll(".label")
    .data(counts)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => x(d.count) - 5) 
    .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4) 
    .attr("fill", "white")
    .attr("text-anchor", "end") 
    .attr("font-weight", "bold")
    .text(d => d.count);

  // Add x-axis
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height - margin.bottom})`) 
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0f")));

  // Add y-axis
  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${margin.left}, 0)`) 
    .call(d3.axisLeft(y))
    .selectAll(".tick text")
    .style("font-size", "12px") 
    .call(wrapText, margin.left - 10); 

  // Funzione per gestire testo lungo
  function wrapText(selection, width) {
    selection.each(function() {
      const text = d3.select(this);
      let words = text.text().split(/\s+/);
      let line = [];
      let lineNumber = 0;
      let lineHeight = 1.1; 
      let y = text.attr("y");
      let x = text.attr("x");
      let dy = parseFloat(text.attr("dy")) || 0;

      let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

      for (let word of words) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  }
}

function createRatingChart(data){
  const svgWidth = d3.select("#chart-content").node().getBoundingClientRect().width - 10
  const svgHeight = data.length * 20 + 100;
  const margin = { top: 30, right: 10, bottom: 30, left: 180 };

  const gameSvg = d3.select("#chart-content")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);
  
  gameSvg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text("Rating")
    .style("font-weight", "bold");

  const ratingX = d3.scaleLinear()
    .domain([0, d3.max(data, n => n.rating) * 1.1])
    .range([margin.left, svgWidth - margin.right]);

  const ratingY = d3.scaleBand()
    .domain(data.map(n => getShortTitle(n.title)))
    .range([margin.top, svgHeight - margin.bottom])
    .padding(0.1);

  gameSvg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", ratingX(0))
    .attr("y", n => ratingY(getShortTitle(n.title)))
    .attr("width", n => ratingX(n.rating) - ratingX(0))
    .attr("height", ratingY.bandwidth())
    .attr("fill", "steelblue")
    .on("mouseover", function(event, n) {
      tooltip
        .html(`Votes: ${data[n]["num_of_reviews"]}`)
        .style("visibility", "visible");
    })
    .on("mousemove", function(event) {
      updateTooltipPosition();
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

    gameSvg.selectAll(".label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => ratingX(d.rating) - 5) 
    .attr("y", d => ratingY(getShortTitle(d.title)) + ratingY.bandwidth() / 2 + 4) 
    .attr("fill", "white")
    .attr("text-anchor", "end") 
    .attr("font-weight", "bold")
    .text(d => d.rating.toFixed(1));

  gameSvg.append("g")
    .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
    .call(d3.axisBottom(ratingX).ticks(5).tickFormat(d3.format(".0f")));

  gameSvg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(ratingY));
}

// Dumbbell chart reusable function
function createDumbbellChart(data, minProp, maxProp, container, title, neighborsLenght) {
  const svgWidth = d3.select("#chart-content").node().getBoundingClientRect().width - 10
  const svgHeight = neighborsLenght * 20 + 100 //200;
  const margin = { top: 30, right: 10, bottom: 30, left: 180 };
  const containerEl = d3.select(container).node();
  containerEl.style.position = "relative";

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
    .domain([0, d3.max(data, n => Math.max(n[minProp], n[maxProp] * 1.1))])
    .range([margin.left, svgWidth - margin.right]);

  const y = d3.scaleBand()
    .domain(data.map(n => getShortTitle(n.title)))
    .range([margin.top, svgHeight - margin.bottom])
    .padding(0.4);

  svg.selectAll("line")
    .data(data)
    .enter()
    .append("line")
    .attr("x1", d => x(d[minProp]))
    .attr("x2", d => x(d[maxProp]))
    .attr("y1", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
    .attr("y2", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
    .attr("stroke", "gray")
    .attr("stroke-width", "2px")
    .on("mouseover", function(event, n) {
      tooltip
        .html(`${minProp}: ${data[n][minProp]} - ${maxProp}: ${data[n][maxProp]}`)
        .style("visibility", "visible");
    })
    .on("mousemove", function(event) {
      updateTooltipPosition();
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  svg.selectAll("circle.min")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dumbbell-circle")
    .attr("cx", d => x(d[minProp]))
    .attr("cy", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", "#69b3a2")
    .on("mouseover", function(event, n) {
      tooltip
        .html(`${minProp}: ${data[n][minProp]}`)
        .style("visibility", "visible");
    })
    .on("mousemove", function(event) {
      updateTooltipPosition();
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  svg.selectAll("circle.max")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dumbbell-circle")
    .attr("cx", d => x(d[maxProp]))
    .attr("cy", d => y(getShortTitle(d.title)) + y.bandwidth() / 2)
    .attr("r", 5)
    .attr("fill", "#4C4082")
    .on("mouseover", function(event, n) {
      tooltip
        .html(`${maxProp}: ${data[n][maxProp]}`)
        .style("visibility", "visible");
    })
    .on("mousemove", function(event) {
      updateTooltipPosition();
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0f")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
}

function updateTooltipPosition() {
  tooltip
    .style("left", (event.pageX - 40) + "px")
    .style("top", (event.pageY + 10) + "px");
};

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
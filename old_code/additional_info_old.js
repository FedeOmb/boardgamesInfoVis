function showAdditionalInfo(dataToVis, containerId) {
    var data = dataToVis;
    data = data.sort((a, b) => d3.ascending(a.rank, b.rank));
  
    var legendWidth = 300;
    var legendHeight = 60;
  
    var infoList = d3.select(`#${containerId} .gamelist`);
    var legendContainer = d3.select(`#${containerId} .gamelist-legend`);
    var attrSelector = d3.select(`#${containerId} .gamelist-controls select`);
  
    if (attrSelector.selectAll("option").empty()) {
      // Inizializza le opzioni del selettore se non presenti
      attrSelector.selectAll("option")
        .data(attrGameList)
        .join("option")
        .attr("value", (d) => d.value)
        .text((d) => d.name)
        .property("selected", (d) => d.value == "rating");
    }
  
    const updateColors = () => {
      const coloringAttr = attrSelector.property("value");
      var values = dataToVis.map(d => d[coloringAttr]);
      const color = d3.scaleSequential([d3.min(values), d3.max(values)], d3.interpolateBlues);
  
      // Aggiorna i colori dei rettangoli
      infoList.selectAll("rect")
        .style("background-color", (d) => color(d[coloringAttr]));
  
      // Aggiorna la legenda
      legendContainer.selectAll("*").remove();
      var legendSvg = legendContainer.append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight);
      createSequentialLegend(legendSvg, color);
    };
  
    // Aggiungi il listener per il cambio del selettore
    attrSelector.on("change", updateColors);
  
    infoList.selectAll("*").remove();
  
    var rectHeight = 50;
    var rectMargin = 2;
    var rectWidth = 100;
  
    const tooltip = d3.select(`#${containerId}`)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("padding", "8px")
    .style("background", "rgba(255, 255, 255, 1)")
    .style("color", "black")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("visibility", "hidden");
  
    var showTooltip = function(event,d){
      var designers = d.designer.map(des => des.name).join(", ");
      tooltip
      .html(`<strong>(${d.rank}°) ${d.title} </strong><br><strong>Year:</strong> ${d.year} <br> <strong>Designers:</strong> ${designers}<br><strong>Min age: </strong>${d.minage} <br> <strong>User rating: </strong>${d.rating.toFixed(2)} <br> <strong>Players: </strong>${d.minplayers} - ${d.maxplayers} <br> <strong>Play Time: </strong>${d.minplaytime} - ${d.maxplaytime}<br>`)
      .style("visibility", "visible");
    }
    var mousemove = function(event,d) {
      tooltip
      .style("left", (event.pageX) + "px")
      .style("top", (event.pageY) + "px")
    }
  
    var rects = infoList.selectAll("g")
      .data(data)
      .join("g")
      .append("rect")
      .style("width", `${rectWidth}px`)
      .style("height", `${rectHeight}px`)
      .style("margin", `${rectMargin}px`)
      .style("padding", "3px")
      .style("border-radius", "5px")
      .style("display", "flex")
      .style("align-items", "center")
      .style("position", "relative")
      .style("justify-content", "left")
      .text(d => `${d.rank}° | ${d.title}`)
      .on("mouseover", showTooltip)
      .on("mousemove", mousemove)
      .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
    });
  
      // Inizializza i colori dei rettangoli e la legenda
      updateColors();
  }
  
  function createSequentialLegend(legendSvg, colorScale) {
    const width = legendSvg.node().getBoundingClientRect().width;
    const height = legendSvg.node().getBoundingClientRect().height;
  
    const domain = colorScale.domain();
    
    const tickFormat = d => d;
    const tickSize = 6;
    
    const legend = legendSvg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(10, 10)`);
    
    // Crea una scala x per la posizione dei tick
    const x = d3.scaleLinear()
      .domain(domain)
      .range([0, width - 10 - 10]);
    
    const rectWidth = (width - 10 - 10) / 100;
    const rects = legend.selectAll("rect")
      .data(d3.range(domain[0], domain[1], (domain[1] - domain[0]) / 100))
      .enter()
      .append("rect")
      .attr("x", d => x(d))
      .attr("y", 0)
      .attr("width", rectWidth + 1) // +1 per evitare spazi vuoti
      .attr("height", 15)
      .style("fill", d => colorScale(d));
    
    // Crea l'asse della legenda
    const axis = d3.axisBottom(x)
      .tickSize(tickSize)
      .tickFormat(tickFormat);
    
    // Aggiungi l'asse
    legend.append("g")
      .attr("class", "legend-axis")
      .attr("transform", "translate(0, 15)")
      .call(axis)
      .call(g => g.select(".domain").remove());
  }
  

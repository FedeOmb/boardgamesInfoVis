function showAdditionalCharts(data, attrMainChart, containerId) {

  const chartSelector = d3.select(containerId + " .chart-selector");
  const chartContent = d3.select(containerId + " .chart-content");
  const showAllSelector = d3.select(containerId + " .show-all-selector");
  showAllSelector.style("display", "none");
  chartSelector.style("display", "flex");
  chartContent.style("display", "flex");

  chartContent.html("");
  const buttons = chartSelector.selectAll(".chart-btn");
  buttons.classed("active", false);

  // Set the "rating" button as active by default
  const defaultButton = buttons.filter('[data-chart="rating"]');
  defaultButton.classed("active", true);

  let filteredData = data;
  filteredData.sort((a, b) => d3.ascending(a.rank, b.rank));
  if(data.length > 10){
    showAllSelector.style("display", "flex");
    const showValue = showAllSelector.select("input[type='radio']:checked").property("value");
    if(showValue =="top10"){
      filteredData = data.slice(0,10);
    }
  }

  createAdditionalBarchart(filteredData, chartContent, "rating", "User rating", attrMainChart, (value) => value.toFixed(2));

  //function to show graphs based on current selections
  function showGraphs(chartType) {
    const showValue = showAllSelector.select("input[type='radio']:checked").property("value");
    let filteredData = data;
    filteredData.sort((a, b) => d3.ascending(a.rank, b.rank));
    if(showValue =="top10"){
      filteredData = filteredData.slice(0,10);
    }
    console.log(filteredData)
    chartContent.html("");
    if (chartType === "minage") {
      createAdditionalBarchart(filteredData, chartContent, "minage", "Minimum player age", attrMainChart, (value) => value);
    } else if (chartType === "players") {
      createDumbbellChart(filteredData, "minplayers", "maxplayers", chartContent, "Players");
    } else if (chartType === "playtime") {
      createDumbbellChart(filteredData, "minplaytime", "maxplaytime", chartContent, "Playtime (min)");
    } else if (chartType === "rating") {
      createAdditionalBarchart(filteredData, chartContent, "rating", "User rating", attrMainChart, (value) => value.toFixed(2));
    }
  }

  //listener for show all selector
  showAllSelector.selectAll("input[type='radio']").on("change", function(){
    const chartType = chartSelector.select(".chart-btn.active").attr("data-chart");
    showGraphs(chartType);
  });
  //listener for chart type buttons
  buttons.on("click", function(){
    const chartType = d3.select(this).attr("data-chart");
    buttons.classed("active", false);
    d3.select(this).classed("active", true);
    showGraphs(chartType)
  });
}


function createAdditionalBarchart(data, chartContainer, attr, title, attrMainChart, formatLabel = (value) => value){
    var svgWidth = chartContainer.node().getBoundingClientRect().width;
    var svgHeight = chartContainer.node().getBoundingClientRect().height;
  
    const chartMargin = { top: 30, right: 20, bottom: 0, left: 170 };
    svgHeight = data.length * 25 + chartMargin.top + chartMargin.bottom;
  
    chartContainer.selectAll("*").remove();
    var svg = chartContainer.append("svg").attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  
    const chartWidth = svgWidth - (chartMargin.right + chartMargin.left);
    const chartHeight = svgHeight - (chartMargin.top + chartMargin.bottom);
    const maxValue = d3.max(data, (d) => d[attr]);
    
    //definizione scale per gli assi
    const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, chartWidth]);
    const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.title))
    .range([0, chartHeight])
    .padding(0.3);

    var barsColor;
    if(attrMainChart=="year"){
      barsColor = "teal";
    }else{
      barsColor = colorsBarchart1[attrMainChart];
    }

    console.log(attrMainChart)

/*     const tooltip = chartContainer.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "rgba(255, 255, 255, 1)")
    .style("color", "black")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("visibility", "hidden"); */


    svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", chartMargin.top - 20)
    .attr("text-anchor", "middle")
    .text(title)
    .style("font-weight", "bold");
  
    var showTooltip = function(event,d){
      var designers = d.designer.map(des => des.name).join(", ");
      tooltip
      .html(`<strong>(${d.rank}°) ${d.title} </strong><br><strong>Year:</strong> ${d.year} <br> <strong>Designers:</strong> ${designers}<br><strong>Min age: </strong>${d.minage} <br> <strong>User rating: </strong>${d.rating.toFixed(2)} <br> <strong>Players: </strong>${d.minplayers} - ${d.maxplayers} <br> <strong>Play Time: </strong>${d.minplaytime} - ${d.maxplaytime}<br>`)
      .style("visibility", "visible");
    }

    var mousemove = function(event,d) {
      tooltip
      .style("left", (event.pageX) + "px")
      .style("top", (event.pageY) + "px");
    }
  
    const innerChart = svg
      .append("g")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`)
  
    // gruppo rect + label interna
    const barAndLabel = innerChart
      .selectAll(".bar-group")
      .data(data)
      .join("g")
      .attr("class", "bar-group")
      .attr("transform", (d) => `translate(0, ${yScale(d.title)})`);
  
    barAndLabel
      .append("rect")
      .attr("width", (d) => xScale(d[attr]))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", d3.color(barsColor).darker())
      .on("mouseover", showTooltip)
      .on("mousemove", mousemove)
      .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
      });
  
    barAndLabel
      .append("text")
      .text((d) => formatLabel(d[attr]))
      .attr("x", (d) => xScale(d[attr]) - 10)
      .attr("y", (yScale.bandwidth() / 2) + 2)
      .style("text-anchor", "end")
      .style("font-family", "sans-serif")
      .style("font-size", "11px")
      .style("fill", "white")
      .style("font-weight", "bold");

  
      //aggiunta assi
    innerChart
      .append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("transform", "translate(-5,0)")
      .style("text-anchor", "end")
      .style("font-size", "11px")
      .each( function(d) {
        wrapText(this,d);
      });
  
    innerChart
      .append("g")
      .call(d3.axisTop(xScale));
  }

// Dumbbell chart reusable function
function createDumbbellChart(data, minProp, maxProp, chartContainer, title) {
  console.log(data)

    var svgWidth = chartContainer.node().getBoundingClientRect().width;
    var svgHeight = chartContainer.node().getBoundingClientRect().height;
    
    const margin = { top: 40, right: 10, bottom: 0, left: 170 };
    svgHeight = data.length * 25 + margin.top + margin.bottom;
  
    chartContainer.selectAll("*").remove();
    const svg = chartContainer.append("svg").attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  
    //const chartWidth = svgWidth - (margin.right + margin.left);
    //const chartHeight = svgHeight - (margin.top + margin.bottom);

    const max_count = d3.max(data, n => Math.max(n[minProp], n[maxProp]));

    function updateTooltipPosition() {
      tooltip
        .style("left", (event.pageX - 40) + "px")
        .style("top", (event.pageY + 10) + "px");
    };
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", margin.top -20)
      .attr("text-anchor", "middle")
      .text(title)
      .style("font-weight", "bold");
  
    const x = d3.scaleLinear()
      .domain([0, max_count])
      .range([margin.left, svgWidth - margin.right]);
  
    const y = d3.scaleBand()
      .domain(data.map(n => n.title))
      .range([margin.top, svgHeight - margin.bottom])
      .padding(0.4);
  
    const lines = svg.selectAll("line")
      .data(data)
      .enter()
      .append("line")
      .attr("x1", d => x(d[minProp]))
      .attr("x2", d => x(d[maxProp]))
      .attr("y1", d => y(d.title) + y.bandwidth() / 2)
      .attr("y2", d => y(d.title) + y.bandwidth() / 2)
      .attr("stroke", "gray")
      .attr("stroke-width", "1px")
      .on("mouseover", function(event, d) {
        console.log(d)
        tooltip
          .html(`${minProp}: ${d[minProp]} - ${maxProp}: ${d[maxProp]}`)
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
      .attr("cy", d => y(d.title) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", "#69b3a2")
      .on("mouseover", function(event, d) {
        tooltip
          .html(`${minProp}: ${d[minProp]}`)
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
      .attr("cy", d => y(d.title) + y.bandwidth() / 2)
      .attr("r", 5)
      .attr("fill", "#4C4082")
      .on("mouseover", function(event, d) {
        tooltip
          .html(`${maxProp}: ${d[maxProp]}`)
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
      .attr("transform", `translate(0,${margin.top})`)
      .call(d3.axisTop(x)
        .ticks(max_count > 10 ? x.ticks().length : max_count)
        .tickFormat(d => Number.isInteger(d) ? d : ""));
  
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("transform", "translate(-5,0)")
      .style("text-anchor", "end")
      .style("font-size", "11px")
      .each( function(d) {
        wrapText(this,d);
      })

  }

  /*
  function createCategoriesChart(data, chartContainer) {
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
    const svg = chartContainer
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
      */
//function to create additional charts on barchart page
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
  console.log(filteredData)

  var barsColor;
  if(attrMainChart=="year"){
    barsColor = colorBarchart2;
  }else{
    barsColor = colorsBarchart1[attrMainChart];
  }

  const maxValue = 10;
  createAdditionalBarchart(filteredData, chartContent, "rating", maxValue,"User rating", barsColor, (value) => value.toFixed(2));

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
      const maxValue = getMaxMinAge(dataset);
      createAdditionalBarchart(filteredData, chartContent, "minage", maxValue,"Minimum player age", barsColor, (value) => value);
    } else if (chartType === "players") {
      createDumbbellChart(filteredData, "minplayers", "maxplayers", chartContent, "Players");
    } else if (chartType === "playtime") {
      createDumbbellChart(filteredData, "minplaytime", "maxplaytime", chartContent, "Playtime (min)");
    } else if (chartType === "rating") {
      const maxValue = 10;
      createAdditionalBarchart(filteredData, chartContent, "rating", maxValue, "User rating", barsColor, (value) => value.toFixed(2));
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

//-- Common function to create bar chart for a given attribute--
function createAdditionalBarchart(data, chartContainer, attr, maxValue, title, barsColor, formatLabel = (value) => value){
    var svgWidth = chartContainer.node().getBoundingClientRect().width;
    var svgHeight = chartContainer.node().getBoundingClientRect().height;
  
    const chartMargin = { top: 30, right: 50, bottom: 0, left: 180 };
    svgHeight = data.length * 25 + chartMargin.top + chartMargin.bottom;
  
    chartContainer.selectAll("*").remove();
    var svg = chartContainer.append("svg").attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  
    const chartWidth = svgWidth - (chartMargin.right + chartMargin.left);
    const chartHeight = svgHeight - (chartMargin.top + chartMargin.bottom);
    
    //definizione scale per gli assi
    const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, chartWidth]);
    const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.title))
    .range([0, chartHeight])
    .padding(0.2);

    svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", chartMargin.top - 20)
    .attr("text-anchor", "middle")
    .text(title)
    .style("font-weight", "bold");
  
    var showTooltip = function(event,d){
      var designers = d.designer.map(des => des.name).join(", ");
      tooltip
      .html(`<strong>(${d.rank}°) ${d.title} </strong><br>
        <strong>Year:</strong> ${d.year} <br> 
        <strong>Designers:</strong> ${designers}<br>
        <strong>Min age: </strong>${d.minage} <br> 
        <strong>User rating: </strong>${d.rating.toFixed(2)} | <strong>Votes: </strong>${d.num_of_reviews}<br> 
        <strong>Players: </strong>${d.minplayers} - ${d.maxplayers} <br> 
        <strong>Play Time: </strong>${d.minplaytime} - ${d.maxplaytime} min<br>`)
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
    const barGroup = innerChart
      .selectAll(".bar-group")
      .data(data)
      .join("g")
      .attr("class", "bar-group")
      .attr("transform", (d) => `translate(0, ${yScale(d.title)})`);
  
    barGroup
      .append("rect")
      .attr("width", (d) => xScale(d[attr]))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", d3.color(barsColor))
      .on("mouseover", showTooltip)
      .on("mousemove", mousemove)
      .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
      });
  
    barGroup
      .append("text")
      .text((d) => formatLabel(d[attr]))
      .attr("x", (d) => xScale(d[attr]) - 10)
      .attr("y", (yScale.bandwidth() / 2) + 4)
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


//-- Common function to create dumbbell chart --
function createDumbbellChart(data, minProp, maxProp, chartContainer, title) {
  console.log(data)

    var svgWidth = chartContainer.node().getBoundingClientRect().width;
    var svgHeight = chartContainer.node().getBoundingClientRect().height;
    
    const margin = { top: 40, right: 50, bottom: 0, left: 180 };
    svgHeight = data.length * 25 + margin.top + margin.bottom;
  
    chartContainer.selectAll("*").remove();
    const svg = chartContainer.append("svg").attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

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

  //--ADDITIONAL CHARTS FOR FORCE DIRECTED--
  
  function createCategoriesChart(data) {
    // Extract categories
    let categories = data.flatMap(d => d.categories || []);
    
    const counts = Array.from(
      d3.rollup(categories, v => v.length, d => d.name),
      ([name, count]) => ({ name, count })
    );
  
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
        .filter(d =>  d.categories.some(cat => cat.name === n.name))
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
      .call(wrapText2, margin.left - 10); 
  }

  /*
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

    // Funzione per gestire testo lungo

  
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
      .on("mouseover", function(event, d) {
        tooltip
          .html(`Votes: ${d.num_of_reviews}`)
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
  }*/

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

  function wrapText2(selection, width) {
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

  function getMaxMinAge(dataset){
    return Math.max(...dataset.nodes.map(item => item.minage));
  }
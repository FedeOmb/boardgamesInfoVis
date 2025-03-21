
var ages = [];
var categories = [];
var mechanics = [];
var designers = [];
var dataset = {};
var categByYear = [];
var typeByYear = [];
var years = [];
var types = [];

const cont3 = d3.select("#bar-chart-3");
const cont2 = d3.select("#bar-chart-2");
const cont1 = d3.select("#bar-chart-1");
const svg1 = cont1.append("svg");
const svg2 = cont2.append("svg");
const svg3 = cont3.append("svg");
var svg1Width = +cont1.node().getBoundingClientRect().width;
var svg1Height = +cont1.node().getBoundingClientRect().height;
svg1.attr("viewBox", `0 0 ${svg1Width} ${svg1Height}`);

var xScale3;
var xScaleSubgroups3;
var yScale3;
var colorScaleTypes;
var axisX3;
var axisY3;
const legend3Height = 20;
const chart3Margin = { top: 20 + legend3Height, right: 20, bottom: 50, left: 50 };
var chart3Width;
var chart3Height;

  var maxItemsToVis1 = 10;
  var maxItemsToVis2 = 10;
  var minYearToVis = 0;
  var maxYearToVis = 10;
  var selectedTypes = [];
  const attrList1 = [
    {value: "categories", name: "Categories"}, 
    {value: "mechanics", name: "Mechanics"}, 
    {value: "designers", name: "Designers"}];
  const attrGameList = [
      {value: "rank", name: "Rank in top 100"}, 
      {value: "rating", name: "User Rating"}, 
      {value: "minage", name: "Minimum Age"}];
  
  const attrSelector1 = d3.select("#select-attribute-1");
  const rangeSlider1 = d3.select("#max-items-1");
  const rangeValue1 = d3.select("#range-value-1");
  const maxValue1 = d3.select("#max-value-1");  

  const orderSelection2 = d3.selectAll("input[name='order-type']");
  const rangeSlider2 = d3.select("#max-items-2");
  const rangeValue2 = d3.select("#range-value-2");

  const yearSliderMax = d3.select("#max-year");
  const yearSliderMaxValue = d3.select("#max-year-value");
  const yearSliderMin = d3.select("#min-year");
  const yearSliderMinValue = d3.select("#min-year-value");

  //--- listener controlli tab 1 ----
  //listener per cambio attributo
  attrSelector1.on("change", () => {
    const attr = attrSelector1.property("value");

    maxItemsToVis1 = 20;
    rangeSlider1.attr("max", window[attr].length);
    maxValue1.text(window[attr].length);
    rangeSlider1.attr("value", maxItemsToVis1);
    rangeValue1.text(maxItemsToVis1.toString());
    createBarchart1(window[attr], "name", "count");
    });

    //listener per modifica slider
    rangeSlider1.on("change", () => {
      maxItemsToVis1 = rangeSlider1.property("value");
      rangeValue1.text(maxItemsToVis1.toString());
      attr = attrSelector1.property("value");
      createBarchart1(window[attr], "name", "count");
    })

  //--- listener controlli tab2 ---

  rangeSlider2.on("change", () => {
    maxItemsToVis2 = rangeSlider2.property("value");
    rangeValue2.text(maxItemsToVis2.toString())
    createBarchart2(ages, "count", "age");
  })

  orderSelection2.on("change", () => {
    var orderValue = d3.select("input[name='order-type']:checked").property("value");
    console.log(orderValue)
    if(orderValue == "count"){
      ages = d3.sort(ages, (a, b) => d3.descending(a.count, b.count));
    }
    if(orderValue == "age"){
      ages = d3.sort(ages, (a, b) => d3.ascending(a.age, b.age));
    }
    createBarchart2(ages, "count", "age");
  })
  //--- listener controlli tab3 ---
  yearSliderMax.on("change", () => {
    maxYearToVis = parseInt(yearSliderMax.property("value"));
    minYearToVis = parseInt(yearSliderMin.property("value"));
    if (maxYearToVis <= minYearToVis) {
      maxYearToVis = minYearToVis + 1;
      yearSliderMax.property("value", maxYearToVis);
    }
    yearSliderMaxValue.text(years[maxYearToVis].toString());
    updateChart3(typeByYear, selectedTypes);
  });

  yearSliderMin.on("change", () => {
    maxYearToVis = parseInt(yearSliderMax.property("value"));
    minYearToVis = parseInt(yearSliderMin.property("value"));
    if (minYearToVis >= maxYearToVis) {
      minYearToVis = maxYearToVis - 1;
      yearSliderMin.property("value", minYearToVis);
    }
    yearSliderMinValue.text(years[minYearToVis].toString());
    updateChart3(typeByYear, selectedTypes);
  });

loadDatasets();

function openTab(event, tabName) {
  var i, tabContent, tabButtons;
  
  // Nasconde tutti i contenuti delle schede
  tabContent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabContent.length; i++) {
      tabContent[i].style.display = "none";
  }
  // Rimuove la classe "active" da tutti i pulsanti
  tabButtons = document.getElementsByClassName("tab-button");
  for (i = 0; i < tabButtons.length; i++) {
      tabButtons[i].className = tabButtons[i].className.replace(" active", "");
  }
  // Mostra la scheda corrente e aggiunge una classe "active" al pulsante
  document.getElementById(tabName).style.display = "flex";
  event.currentTarget.className += " active";

  if(tabName == "tab-1"){
    const attr = attrSelector1.property("value");
    createBarchart1(window[attr], "name", "count");
  }
  if(tabName == "tab-2"){
    createBarchart2(ages, "count", "age");
  }
  if(tabName == "tab-3"){
    createBarchart3(typeByYear);
  }
}

//vers6 di d3 funziona solo con d3.json().then()

async function loadDatasets(){

  Promise.all([
    d3.json("data/dataset_converted_cleaned_v2.json"),
    d3.json("data/categories.json"),
    d3.json("data/mechanics.json"),
    d3.json("data/designers.json")
  ]).then(([data, catData, mecData, desData]) =>{

    ages = calcAges(data);
    categByYear = calcCategByYears(data);
    typeByYear = calcTypeByYears2(data);
    catData.forEach( d => {
      d.count = d.games.length
    });
    mecData.forEach( d => {
      d.count = d.games.length
    });
    desData.forEach( d => {
      d.count = d.games.length
    });
    mecData = d3.sort(mecData, (a, b) => d3.descending(a.count, b.count))
    catData = d3.sort(catData, (a, b) => d3.descending(a.count, b.count))
    desData = d3.sort(desData, (a, b) => d3.descending(a.count, b.count))

    dataset = data;
    categories = catData;
    mechanics = mecData;
    designers = desData;
    console.log("categories",categories);
    console.log("mechanics",mechanics);
    console.log("designers",designers);
    console.log("fulldataset",dataset);

    //inizializzazione controlli filtri in tutte le tab
    //aggiungi opzioni attributi al selettore
    attrSelector1.selectAll("option")
      .data(attrList1)
      .join("option")
      .attr("value", (d) => d.value)
      .text((d) => d.name)
      .property("selected", (d) => d.value == "categories");

    maxItemsToVis1 = 20;
    rangeSlider1.attr("max", categories.length)
    rangeSlider1.attr("value", maxItemsToVis1)
    rangeValue1.text(maxItemsToVis1.toString())

    maxItemsToVis2 = ages.length;
    rangeSlider2.attr("max", maxItemsToVis2);
    rangeSlider2.attr("value", maxItemsToVis2);
    rangeValue2.text(maxItemsToVis2.toString());

    maxYearToVis = years.length-1;
    minYearToVis = 0;
    yearSliderMax.attr("max", years.length-1).attr("min", 0);
    yearSliderMax.attr("value", maxYearToVis);
    yearSliderMaxValue.text(years[maxYearToVis].toString());
    yearSliderMin.attr("max", years.length-1).attr("min", 0);
    yearSliderMin.attr("value", minYearToVis);
    yearSliderMinValue.text(years[minYearToVis].toString());

    createBarchart1(categories, "name", "count");
  });

}

function createBarchart1(dataToVis, varY, varX){
  var svgWidth = svg1Width;
  var svgHeight = svg1Height
  var data = dataToVis.slice(0, maxItemsToVis1);
  if(maxItemsToVis1 > 20){
    svgHeight = svg1Height + (maxItemsToVis1 - 20) * 20;
    svg1.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  } else {
    svgHeight = svg1Height;
  }

  const chartMargin = { top: 40, right: 20, bottom: 20, left: 150 };
  const chartWidth = svgWidth - (chartMargin.right + chartMargin.left);
  const chartHeight = svgHeight - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d[varX]);
  
  //definizione scale per gli assi
  const xScale = d3.scaleLinear().domain([0, max_count]).range([0, chartWidth]);
  const yScale = d3
  .scaleBand()
  .domain(data.map((d) => d[varY]))
  .range([0, chartHeight])
  .padding(0.2);

  svg1.selectAll("*").remove();

  const innerChart = svg1
    .append("g")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`)

    innerChart.append("g").call((g) => g
    .attr('class', 'grid')
    .selectAll('line')
    .data(xScale.ticks())
    .join('line')
    .attr('x1', d => xScale(d))
    .attr('x2', d => xScale(d))
    .attr('y1', 0)
    .attr('y2', chartHeight)
  );

  // gruppo rect + label interna
  const barAndLabel = innerChart
    .selectAll(".bar-group")
    .data(data)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(0, ${yScale(d[varY])})`);

  barAndLabel
    .append("rect")
    .attr("width", (d) => xScale(d[varX]))
    .attr("height", yScale.bandwidth())
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", d3.color("teal"))
    .on("click", (event,d) => {
      d3.selectAll("rect").attr("fill", d3.color("teal"));
      d3.select(event.currentTarget).attr("fill", d3.color("teal").darker());
      var games = d.games;
      var dataToVis = [];
      games.forEach(game => {
        var gameData = dataset.nodes.find(d => d.id == game);
        dataToVis.push(gameData);
      });
      console.log(dataToVis);
      //createAdditionalBarchart(dataToVis, "title", "rating");
      showAdditionalInfo(dataToVis, "additional-info-1");
    });

  barAndLabel
    .append("text")
    .text((d) => d.count)
    .attr("x", (d) => xScale(d[varX]) + 3)
    .attr("y", yScale.bandwidth() / 2)
    .style("font-family", "sans-serif")
    .style("font-size", "9px");

    //aggiunta assi
  innerChart
    .append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .attr("transform", "translate(-10,0)")
    .style("text-anchor", "end");

  innerChart
    .append("g")
    .call(d3.axisTop(xScale));

      // aggiunta etichette degli assi
      innerChart
      .append("text")
      .attr("transform", `translate(${chartWidth / 2}, -30)`)
      .style("text-anchor", "middle")
      .text("Number of games");

    innerChart
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - chartMargin.left )
      .attr("x", 0 - 200)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(attrSelector1.select("option:checked").text());

    svg1.on("click", (event) => {
      if (event.target.tagName === "svg") {
        d3.select("#additional-info-1 .gamelist" ).selectAll("*").remove();
        d3.select("#additional-info-1 .gamelist-legend").selectAll("*").remove();
        d3.selectAll("rect").attr("fill", d3.color("teal"));
      }
    });
};

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

/*
function createAdditionalBarchart(dataToVis, varY, varX){
  var svgWidth = d3.select("#additional-chart-1").node().getBoundingClientRect().width;
  var svgHeight = d3.select("#additional-chart-1").node().getBoundingClientRect().height;

  var data = dataToVis;
  data = data.sort((a, b) => d3.descending(a.rating, b.rating));

  const chartMargin = { top: 30, right: 20, bottom: 0, left: 150 };
  svgHeight = data.length * 20 + chartMargin.top + chartMargin.bottom;

  var svg = d3.select("#additional-chart-1");
  svg.selectAll("*").remove();
  svg = svg.append("svg").attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  const chartWidth = svgWidth - (chartMargin.right + chartMargin.left);
  const chartHeight = svgHeight - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d[varX]);
  
  //definizione scale per gli assi
  const xScale = d3.scaleLinear().domain([0, max_count]).range([0, chartWidth]);
  const yScale = d3
  .scaleBand()
  .domain(data.map((d) => d[varY]))
  .range([0, chartHeight])
  .padding(0.2);


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
    .attr("transform", (d) => `translate(0, ${yScale(d[varY])})`);

  barAndLabel
    .append("rect")
    .attr("width", (d) => xScale(d[varX]))
    .attr("height", yScale.bandwidth())
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", "teal");

  barAndLabel
    .append("text")
    .text((d) => d.rating.toFixed(2))
    .attr("x", (d) => xScale(d[varX]) - 10)
    .attr("y", (yScale.bandwidth() / 2) + 2)
    .style("text-anchor", "end")
    .style("font-family", "sans-serif")
    .style("font-size", "9px")
    .style("fill", "white");  

    //aggiunta assi
  innerChart
    .append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .attr("transform", "translate(-10,0)")
    .style("text-anchor", "end");

  innerChart
    .append("g")
    .call(d3.axisTop(xScale));

  innerChart
    .append("text")
    .attr("transform", `translate(${chartWidth / 2}, -20)`)
    .style("text-anchor", "middle")
    .text("Voto");
};*/


function createBarchart2(dataToVis, varY, varX){
  var svg2Width = +cont2.node().getBoundingClientRect().width;
  var svg2Height = +cont2.node().getBoundingClientRect().height;
  svg2.attr("viewBox", `0 0 ${svg2Width} ${svg2Height}`);

  var data = dataToVis.slice(0, maxItemsToVis2);

  const chartMargin = { top: 20, right: 20, bottom: 100, left: 100 };
  const chartWidth = svg2Width - (chartMargin.right + chartMargin.left);
  const chartHeight = svg2Height - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d[varY]);
  
  //definizione scale per gli assi
  const yScale = d3.scaleLinear().domain([0, max_count]).range([chartHeight, 0]);
  const xScale = d3
  .scaleBand()
  .domain(data.map((d) => d[varX]))
  .range([0, chartWidth])
  .padding(0.2);

  svg2.selectAll("*").remove();

  const innerChart = svg2
    .append("g")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);

    innerChart.append("g").call((g) => g
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks())
      .join('line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
    );

  // gruppo rect + label interna
  const barAndLabel = innerChart
    .selectAll(".bar-group")
    .data(data)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(${xScale(d[varX])}, 0)`);

  barAndLabel
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => chartHeight - yScale(d[varY]))
    .attr("x", 0)
    .attr("y", (d) => yScale(d[varY]))
    .attr("fill", "teal")
    .on("click", (event,d) => {
      d3.selectAll("rect").attr("fill", d3.color("teal"));
      d3.select(event.currentTarget).attr("fill", d3.color("teal").darker());
      var games = d.games;
      var dataToVis = [];
      games.forEach(game => {
        var gameData = dataset.nodes.find(d => d.id == game);
        dataToVis.push(gameData);
      });
      console.log(dataToVis);
      showAdditionalInfo(dataToVis, "additional-info-2");
    });

  barAndLabel
    .append("text")
    .text((d) => d.count)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", (d) => yScale(d[varY]) - 3)
    .style("font-family", "sans-serif")
    .style("font-size", "9px");

    //aggiunta assi
  innerChart
    .append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("text-anchor", "center");

  innerChart
    .append("g")
    .call(d3.axisLeft(yScale));
  
    // aggiunta etichette degli assi
  innerChart
    .append("text")
    .attr("transform", `translate(${chartWidth / 2}, ${chartHeight + 30})`)
    .style("text-anchor", "middle")
    .text("Age of the games (years from release date to 2023)");

  innerChart
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - 50 )
    .attr("x", 0 - 200)
    .style("text-anchor", "middle")
    .text("Number of games");

    svg2.on("click", (event) => {
      if (event.target.tagName === "svg") {
        d3.select("#additional-info-2 .gamelist" ).selectAll("*").remove();
        d3.select("#additional-info-2 .gamelist-legend").selectAll("*").remove();
        d3.selectAll("rect").attr("fill", d3.color("teal"));
      }
    });
  
};



function createBarchart3(dataToVis){
  var svg3Width = +cont3.node().getBoundingClientRect().width;
  var svg3Height = +cont3.node().getBoundingClientRect().height;
  svg3.attr("viewBox", `0 0 ${svg3Width} ${svg3Height}`);

  var data = dataToVis; 
  var yearsToVis = years.sort((a, b) => d3.ascending(a, b));
  console.log(yearsToVis);
  yearsToVis = yearsToVis.slice(minYearToVis, maxYearToVis);
  types = [...new Set(data.map(d => d.type))]; 
  selectedTypes = types;
  console.log(types);

  chart3Width = svg3Width - (chart3Margin.right + chart3Margin.left);
  chart3Height = svg3Height - (chart3Margin.top + chart3Margin.bottom);
  const max_count = d3.max(data, (d) => d.games.length);
  
  //definizione scale per gli assi
  xScale3 = d3
  .scaleBand()
  .domain(yearsToVis)
  .range([0, chart3Width])
  .padding(0.2);

  xScaleSubgroups3 = d3
  .scaleBand()
  .domain(types)
  .range([0, xScale3.bandwidth()])
  .padding(0.1);

  yScale3 = d3.scaleLinear()
  .domain([0, max_count])
  .range([chart3Height, 0]);

  colorScaleTypes = d3.scaleOrdinal()
  .domain(types)
  .range(d3.schemeCategory10);

  svg3.selectAll("*").remove();

  const legend = svg3.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${chart3Margin.left}, 0)`)
  .attr("width", chart3Width)
  .attr("height", legend3Height);

  const innerChart = svg3
    .append("g")
    .attr("class", "chart-group")
    .attr("width", chart3Width)
    .attr("height", chart3Height)
    .attr("transform", `translate(${chart3Margin.left},${chart3Margin.top})`);

  const chartContent = innerChart
    .append("g")
    .attr("class", "chart-content")
    .attr("width", chart3Width)
    .attr("height", chart3Height);
    
    //aggiunta assi
  axisX3 = innerChart
    .append("g")
    .attr("class", "axis-x")
    .attr("transform", `translate(0, ${chart3Height})`)

  axisY3 = innerChart
    .append("g")
    .attr("class", "axis-y")
    .call(d3.axisLeft(yScale3));

      // aggiunta etichette degli assi
  innerChart
  .append("text")
  .attr("transform", `translate(${chart3Width / 2}, ${chart3Height + 30})`)
  .style("text-anchor", "middle")
  .text("Release year");

  innerChart
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - 20 )
  .attr("x", 0 - chart3Height/2)
  .style("text-anchor", "middle")
  .text("Number of games");

  //creazione legenda e inizializzazione grafico
  createLegend3(types);
  updateChart3(dataToVis, types);

};

function updateChart3(dataToVis, selectedTypes) {
  var yearsToVis = years.sort((a, b) => d3.ascending(a, b));
  yearsToVis = yearsToVis.slice(minYearToVis, maxYearToVis);
  //var data = dataToVis.filter(d => yearsToVis.includes(d.year)); 
  var data = dataToVis.filter(d => selectedTypes.includes(d.type)); 
  console.log(yearsToVis);
  console.log(data);

  const max_count = d3.max(data, (d) => d.games.length);

  xScale3
  .domain(yearsToVis);

  xScaleSubgroups3
  .domain(types)
  .range([0, xScale3.bandwidth()])

  yScale3
  .domain([0, max_count]);

  // Aggiungi rettangoli di sfondo alternati
  const innerChart = svg3.select(".chart-content");
  innerChart.selectAll("*").remove();

  const backgroundRectWidth = xScale3.bandwidth();

  innerChart.selectAll(".background-rect")
  .data(yearsToVis)
  .join("rect")
  .attr("class", "background-rect")
  .attr("x", (d) => (xScale3(d)))
  .attr("y", 0)
  .attr("width", backgroundRectWidth)
  .attr("height", chart3Height)
  .attr("fill", (d, i) => (i % 2 == 0 ? "#f0f0f0" : "#f9f9f9"));

  innerChart.append("g").call((g) => g
    .attr('class', 'grid')
    .selectAll('line')
    .data(yScale3.ticks())
    .join('line')
    .attr('x1', 0)
    .attr('x2', chart3Width)
    .attr('y1', d => yScale3(d))
    .attr('y2', d => yScale3(d))
  );
  const yearGroups = innerChart.selectAll(".year-group")
    .data(yearsToVis)
    .join("g")
    .attr("class", "year-group")
    .attr("transform", (year) => `translate(${xScale3(year)}, 0)`);

  yearGroups.selectAll("rect")
    .data(year => {
      return selectedTypes.map(type => {
        return data.find(d => d.year == year && d.type == type);
      })
    })
    .join("rect")
    .attr("width", xScaleSubgroups3.bandwidth())
    .attr("height", (d) => chart3Height - yScale3(d.games.length))
    .attr("x", (d) => xScaleSubgroups3(d.type))
    .attr("y", (d) => yScale3(d.games.length))
    .attr("fill", (d) => colorScaleTypes(d.type));

    axisX3.transition()
      .call(d3.axisBottom(xScale3))
      .selectAll("text")
      .style("text-anchor", "center");
    axisY3.transition()    
      .call(d3.axisLeft(yScale3));
}

function createLegend3(types){

  const legend = svg3.select(".legend");
  legend.selectAll("*").remove();
  // aggiunta legenda
  let legendX = 0;
  types.forEach((type, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(${legendX}, 10)`)
      .attr("class", "legend-item")
      .style("cursor", "pointer")
      .on("click", function() {
        if (selectedTypes.includes(type)) {
          selectedTypes = selectedTypes.filter(t => t !== type);
        } else {
          selectedTypes.push(type);
        }
        updateChart3(typeByYear, selectedTypes);
        d3.select(this).select("rect").attr("fill", selectedTypes.includes(type) ? colorScaleTypes(type) : "#ccc");
      });

    legendItem.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", colorScaleTypes(type));

    legendItem.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("font-size", "12px")
      .attr("text-anchor", "start")
      .text(type);

    legendX += legendItem.node().getBBox().width + 10;
  });
}

var activeTab = 1;

var ages = [];
var categories = [];
var mechanics = [];
var designers = [];
var dataset = {};
var categByYear = [];
var typeByYear = [];
var years = [];

const cont3 = d3.select("#bar-chart-3");
const cont2 = d3.select("#bar-chart-2");
const cont1 = d3.select("#bar-chart-1");
const svg1 = cont1.append("svg");
const svg2 = cont2.append("svg");
const svg3 = cont3.append("svg");
var svg1Width = +cont1.node().getBoundingClientRect().width;
var svg1Height = +cont1.node().getBoundingClientRect().height;
svg1.attr("viewBox", `0 0 ${svg1Width} ${svg1Height}`);

  var maxItemsToVis1 = 10;
  var maxItemsToVis2 = 10;
  var minYearToVis = 0;
  var maxYearToVis = 10;
  const attrList1 = [
    {value: "categories", name: "Categorie"}, 
    {value: "mechanics", name: "Meccaniche"}, 
    {value: "designers", name: "Designers"}];
  
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
    createBarchart3(typeByYear);
  });

  yearSliderMin.on("change", () => {
    maxYearToVis = parseInt(yearSliderMax.property("value"));
    minYearToVis = parseInt(yearSliderMin.property("value"));
    if (minYearToVis >= maxYearToVis) {
      minYearToVis = maxYearToVis - 1;
      yearSliderMin.property("value", minYearToVis);
    }
    yearSliderMinValue.text(years[minYearToVis].toString());
    createBarchart3(typeByYear);
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
        dataToVis.push(
          gameData
        );
      });
      console.log(dataToVis);
      //createAdditionalBarchart(dataToVis, "name", "rating");
      showAdditionalInfo(dataToVis);
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
      .text("Numero di giochi");

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
        d3.select("#additional-chart-1").selectAll("*").remove();
        d3.selectAll("rect").attr("fill", d3.color("teal"));
      }
    });
};

function showAdditionalInfo(dataToVis) {

  var infoList = d3.select("#infolist-1");

  var data = dataToVis;
  data = data.sort((a, b) => d3.descending(a.rating, b.rating));

  infoList.selectAll("*").remove();

  var rectHeight = 30;
  var rectMargin = 2;
  var rectWidth = 100;

  const tooltip = d3.select("#additional-info-1")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "fixed")
  .style("padding", "8px")
  .style("background", "rgba(0, 0, 0, 0.7)")
  .style("color", "white")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("font-size", "12px")
  .style("visibility", "hidden");


  var rects = infoList.selectAll("g")
    .data(data)
    .join("g")
    .append("rect")
    .style("width", `${rectWidth}px`)
    .style("height", `${rectHeight}px`)
    .style("margin", `${rectMargin}px`)
    .style("background-color", "lightblue")
    .style("display", "flex")
    .style("align-items", "center")
    .style("position", "relative")
    .style("justify-content", "center")
    .text(d => `${d.title}`)
    .on("mouseover", (event, d) => {
    let rect = event.currentTarget.getBoundingClientRect(); // Otteniamo la posizione del rettangolo
    tooltip.html(`<strong>${d.rank}°: ${d.title} <br>Year: ${d.year} <br>Designer: ${d.designer[0].name}<br>Min age: ${d.minage}</strong><br>`)
    .style("left", (event.pageX) + "px")
    .style("top", (event.pageY) + "px")
      .style("visibility", "visible");
  }).on("mouseout", () => {
    tooltip.style("visibility", "hidden");
  })
  ;
}


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
};


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

/*     // griglia orizzontale
    innerChart.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .tickFormat(""));
 */
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
    .attr("fill", "teal");

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
    
};

function createBarchart3(dataToVis){
  var svg3Width = +cont3.node().getBoundingClientRect().width;
  var svg3Height = +cont3.node().getBoundingClientRect().height;
  svg3.attr("viewBox", `0 0 ${svg3Width} ${svg3Height}`);

  var data = dataToVis; 
  var yearsToVis = years;
  yearsToVis = years.sort((a, b) => d3.ascending(a, b));
  console.log(yearsToVis);
  yearsToVis = yearsToVis.slice(minYearToVis, maxYearToVis);
  const types = [...new Set(data.map(d => d.type))]; 
  console.log(types);
  
  const legendHeight = 20;
  const chartMargin = { top: 20 + legendHeight, right: 20, bottom: 50, left: 20 };
  const chartWidth = svg3Width - (chartMargin.right + chartMargin.left);
  const chartHeight = svg3Height - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d.games.length);
  
  //definizione scale per gli assi

  const xScale = d3
  .scaleBand()
  .domain(yearsToVis)
  .range([0, chartWidth])
  .padding(0.2);

  const xScaleSubgroups = d3
  .scaleBand()
  .domain(types)
  .range([0, xScale.bandwidth()])
  .padding(0.1);

  const yScale = d3.scaleLinear()
  .domain([0, max_count])
  .range([chartHeight, 0]);

  const color = d3.scaleOrdinal()
  .domain(types)
  .range(d3.schemeCategory10);

  svg3.selectAll("*").remove();

  const legend = svg3
    .append("g")
    .attr("transform", `translate(${chartMargin.left}, 0)`)
    .attr("width", chartWidth)
    .attr("height", legendHeight);

  const innerChart = svg3
    .append("g")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`)
  
    // Aggiungi rettangoli di sfondo alternati
  innerChart.selectAll(".background-rect")
    .data(yearsToVis)
    .join("rect")
    .attr("class", "background-rect")
    .attr("x", (d) => xScale(d))
    .attr("y", 0)
    .attr("width", xScale.bandwidth())
    .attr("height", chartHeight)
    .attr("fill", (d, i) => (i % 2 == 0 ? "#f0f0f0" : "#f9f9f9"));

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

  // gruppo rect per anno
  const yearGroups = innerChart
    .selectAll(".year-group")
    .data(yearsToVis)
    .join("g")
    .attr("class", "year-group") 
    .attr("transform", (year) => `translate(${xScale(year)}, 0)`);

  yearGroups
    .selectAll("rect")
    .data(year => {
      return types.map(type => {
          return data.find(d => d.year == year && d.type == type);
      });
    }) 
    .join("rect")
    .attr("width", xScaleSubgroups.bandwidth())
    .attr("height", (d) => chartHeight - yScale(d.games.length))
    .attr("x", (d) => xScaleSubgroups(d.type))  
    .attr("y", (d) => yScale(d.games.length))
    .attr("fill", (d)=> color(d.type));


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

    let legendX = 0;
    types.forEach((type, i) => {
      const legendItem = legend.append("g")
          .attr("transform", `translate(${legendX}, 0)`);

      legendItem.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", color(type));

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("font-size", "12px")
        .attr("text-anchor", "start")
        .text(type);

      legendX += legendItem.node().getBBox().width + 10;
    });
};

function getShortTitle(title){
  title = String(title)
  if(title.length > 35){
    if(title.includes(":"))
        return title.split(":")[0]
    else if(title.includes("("))
        return title.split("(")[0]
  }else return title
}
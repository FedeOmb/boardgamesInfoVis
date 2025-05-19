var categories = [];
var mechanics = [];
var designers = [];
var dataset = {};
var typeByYear = [];
var gamesByYear = [];
var years = [];
var types = [];

//colors definitions
const colorsBarchart1 = { categories: "#4682B4", mechanics: "#FF8C00", designers: "#FF6347" };
const colorYearsChart = "#2F4F4F";
const colorScaleTypes = d3.scaleOrdinal().range(d3.schemeTableau10);
// containers and svg definitions
const cont2 = d3.select("#bar-chart-2");
const cont1 = d3.select("#bar-chart-1");
const svg1 = cont1.append("svg");
const svg2 = cont2.append("svg");

var svg1Width = +cont1.node().getBoundingClientRect().width;
var svg1Height = +cont1.node().getBoundingClientRect().height;
svg1.attr("viewBox", `0 0 ${svg1Width} ${svg1Height}`);

const chart1Margin = { top: 50, right: 20, bottom: 20, left: 170 };

var xScale2;
var xScaleSubgroups2;
var yScale2;
var axisX2;
var axisY2;
const typesLegendHeight = 40;
const chart2Margin = { top: 20 + typesLegendHeight, right: 20, bottom: 50, left: 50 };
var chart2Width;
var chart2Height;

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("padding", "8px")
  .style("background", "rgba(255, 255, 255, 1)")
  .style("color", "black")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("font-size", "12px")
  .style("visibility", "hidden");

var maxItemsToVis1 = 10;
var minYearToVis = 0;
var maxYearToVis = 10;
var selectedTypes = [];
const attrList1 = [
  { value: "categories", name: "Categories" },
  { value: "mechanics", name: "Mechanics" },
  { value: "designers", name: "Designers" }];

const attrSelector1 = d3.select("#select-attribute-1");
const rangeSlider1 = d3.select("#max-items-1");
const rangeValue1 = d3.select("#range-value-1");
const maxValue1 = d3.select("#max-value-1");

const chartType2 = d3.selectAll("input[name='chart-type']");

const yearSliderMax = d3.select("#max-year");
const yearSliderMaxValue = d3.select("#max-year-value");
const yearSliderMin = d3.select("#min-year");
const yearSliderMinValue = d3.select("#min-year-value");

var currentTab = "tab-1";

//--- listener tab 1 controls ----
//listener for attribute change
attrSelector1.on("change", () => {
  const attr = attrSelector1.property("value");

  maxItemsToVis1 = 20;
  rangeSlider1.attr("max", window[attr].length);
  maxValue1.text(window[attr].length);
  rangeSlider1.attr("value", maxItemsToVis1);
  rangeValue1.text(maxItemsToVis1.toString());
  createBarchart1(attr, "name", "count");
  closeAdditionalCharts("#additional-info-1");
});

//listener for slider change
rangeSlider1.on("input", () => {
  maxItemsToVis1 = rangeSlider1.property("value");
  rangeValue1.text(maxItemsToVis1.toString());
  attr = attrSelector1.property("value");
  createBarchart1(attr, "name", "count");
  closeAdditionalCharts("#additional-info-1");
})

//--- listener tab2 controls ---
chartType2.on("change", () => {
  var value = d3.selectAll("input[name='chart-type']:checked").property("value");
  createYearsChart(value);
  closeAdditionalCharts("#additional-info-2");
})

yearSliderMax.on("input", () => {
  var value = d3.selectAll("input[name='chart-type']:checked").property("value");
  maxYearToVis = parseInt(yearSliderMax.property("value"));
  minYearToVis = parseInt(yearSliderMin.property("value"));
  if (maxYearToVis <= minYearToVis) {
    maxYearToVis = minYearToVis + 1;
    yearSliderMax.property("value", maxYearToVis);
  }
  yearSliderMaxValue.text(years[maxYearToVis].toString());
  updateYearsChart(value);
  closeAdditionalCharts("#additional-info-2");
});

yearSliderMin.on("input", () => {
  var value = d3.selectAll("input[name='chart-type']:checked").property("value");
  maxYearToVis = parseInt(yearSliderMax.property("value"));
  minYearToVis = parseInt(yearSliderMin.property("value"));
  if (minYearToVis >= maxYearToVis) {
    minYearToVis = maxYearToVis - 1;
    yearSliderMin.property("value", minYearToVis);
  }
  yearSliderMinValue.text(years[minYearToVis].toString());
  updateYearsChart(value);
  closeAdditionalCharts("#additional-info-2");
});

loadDatasets();

function openTab(event, tabName) {
  var i, tabContent, tabButtons;

  tabContent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabContent.length; i++) {
    tabContent[i].style.display = "none";
  }
  tabButtons = document.getElementsByClassName("tab-button");
  for (i = 0; i < tabButtons.length; i++) {
    tabButtons[i].className = tabButtons[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "flex";
  event.currentTarget.className += " active";
  currentTab = tabName;
  if (tabName == "tab-1") {
    const attr = attrSelector1.property("value");
    createBarchart1(attr, "name", "count");
    closeAdditionalCharts("#additional-info-1");
  }
  if (tabName == "tab-2") {
    var value = d3.selectAll("input[name='chart-type']:checked").property("value");
    createYearsChart(value);
    closeAdditionalCharts("#additional-info-2");
  }
}

async function loadDatasets() {

  Promise.all([
    d3.json("data/dataset_converted_cleaned_v2.json"),
    d3.json("data/categories_network.json"),
    d3.json("data/mechanics_network.json"),
    d3.json("data/designers_network.json")
  ]).then(([data, catData, mecData, desData]) => {

    gamesByYear = calcGamesByYear(data);
    typeByYear = calcTypeByYears(data);

    catData.nodes.forEach(d => {
      d.count = d.games.length
    });
    mecData.nodes.forEach(d => {
      d.count = d.games.length
    });
    desData.nodes.forEach(d => {
      d.count = d.games.length
    });

    dataset = data;
    categories = d3.sort(catData.nodes, (a, b) => d3.descending(a.count, b.count))
    mechanics = d3.sort(mecData.nodes, (a, b) => d3.descending(a.count, b.count))
    designers = d3.sort(desData.nodes, (a, b) => d3.descending(a.count, b.count))

    //Initialization of filter controls in all tabs

    attrSelector1.selectAll("option")
      .data(attrList1)
      .join("option")
      .attr("value", (d) => d.value)
      .text((d) => d.name)
      .property("selected", (d) => d.value == "categories");

    maxItemsToVis1 = 20;
    rangeSlider1.attr("max", categories.length);
    rangeSlider1.attr("value", maxItemsToVis1);
    rangeValue1.text(maxItemsToVis1.toString());
    maxValue1.text(categories.length.toString());

    years = data.nodes.flatMap(d => d.year);
    years = [...new Set(years)];
    years = years.sort((a, b) => d3.ascending(a, b));
    types = [...new Set(typeByYear.map(d => d.type))];
    selectedTypes = types;

    maxYearToVis = years.length - 1;
    minYearToVis = 0;
    yearSliderMax.attr("max", years.length - 1).attr("min", 0);
    yearSliderMax.attr("value", maxYearToVis);
    yearSliderMaxValue.text(years[maxYearToVis].toString());
    yearSliderMin.attr("max", years.length - 1).attr("min", 0);
    yearSliderMin.attr("value", minYearToVis);
    yearSliderMinValue.text(years[minYearToVis].toString());

    createBarchart1("categories", "name", "count");
  });

}

function createBarchart1(attr, varY, varX) {

  var data = window[attr].slice(0, maxItemsToVis1);

  var svgWidth = svg1Width;
  var svgHeight = svg1Height;
  if (maxItemsToVis1 > 20) {
    svgHeight = svg1Height + (maxItemsToVis1 - 20) * 20;
  } else {
    svgHeight = svg1Height;
  }
  svg1.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  const attrSelected = attrSelector1.select("option:checked");
  const barsColor = colorsBarchart1[attr];

  const chartWidth = svgWidth - (chart1Margin.right + chart1Margin.left);
  const chartHeight = svgHeight - (chart1Margin.top + chart1Margin.bottom);
  const max_count = d3.max(data, (d) => d[varX]);

  const infoText = d3.select("#additional-info-1 .info-selected-text");
  const infoDefaultText = d3.select("#additional-info-1 .info-default-text");

  const xScale = d3.scaleLinear().domain([0, max_count]).range([0, chartWidth]);
  const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d[varY]))
    .range([0, chartHeight])
    .padding(0.2);

  svg1.selectAll("*").remove();

  var barSelected = false;

  function showTooltip(d) {
    tooltip
      .html(`<strong>${d.name} : ${d.count} games </strong>`)
      .style("visibility", "visible");
  }

  var mousemove = function (event, d) {
    tooltip
      .style("left", (event.pageX) + "px")
      .style("top", (event.pageY) + "px");
  }
  const innerChart = svg1
    .append("g")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${chart1Margin.left},${chart1Margin.top})`)

  innerChart.append("g").call((g) => g
    .attr('class', 'grid')
    .selectAll('line')
    .data(xScale.ticks().filter(d => Number.isInteger(d)))
    .join('line')
    .attr('x1', d => xScale(d))
    .attr('x2', d => xScale(d))
    .attr('y1', 0)
    .attr('y2', chartHeight)
  );

  const barGroup = innerChart
    .selectAll(".bar-group")
    .data(data)
    .join("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(0, ${yScale(d[varY])})`);

  barGroup
    .append("rect")
    .attr("width", (d) => xScale(d[varX]))
    .attr("height", yScale.bandwidth())
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", d3.color(barsColor))
    .on("mouseover", function (event, d) {
      showTooltip(d);
      if (!barSelected) {
        d3.select(this).attr("fill", d3.color(barsColor).darker());
      }
    })
    .on("mousemove", mousemove)
    .on("mouseout", function (event, d) {
      tooltip.style("visibility", "hidden");
      if (!barSelected) {
        d3.select(this).attr("fill", d3.color(barsColor));
      }
    })
    .on("click", (event, d) => {
      barSelected = true;
      d3.selectAll("rect").attr("fill", d3.color(barsColor));
      d3.select(event.currentTarget).attr("fill", d3.color(barsColor).darker());
      var games = d.games;
      var dataToVis = [];
      games.forEach(game => {
        var gameData = dataset.nodes.find(d => d.id == game);
        dataToVis.push(gameData);
      });
      infoDefaultText.style("display", "none");
      infoText.style("display", "block").html(`Showing statistics about games of <strong>${d.name} </strong>`);
      showAdditionalCharts(dataToVis, attr, "#additional-info-1");
    });

  barGroup
    .append("text")
    .text((d) => d.count)
    .attr("x", (d) => xScale(d[varX]) - 10)
    .attr("y", (yScale.bandwidth() / 2) + 4)
    .style("text-anchor", "end")
    .style("font-family", "sans-serif")
    .style("font-size", "11px")
    .style("fill", "white")
    .style("font-weight", "bold");

  innerChart
    .append("g")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
    .attr("transform", "translate(-10,0)")
    .style("text-anchor", "end")
    .style("font-size", "11px")
    .each(function (d) {
      wrapText(this, d, 25);
    })

  innerChart
    .append("g")
    .call(d3.axisTop(xScale)
      .ticks(max_count > 10 ? xScale.ticks().length : max_count)
      .tickFormat(d => Number.isInteger(d) ? d : ""));

  innerChart
    .append("text")
    .attr("class", "axis-title")
    .attr("transform", `translate(${chartWidth / 2}, ${-30})`)
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Number of games");

  innerChart
    .append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - chart1Margin.left)
    .attr("x", 0 - 200)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(attrSelected.text());

  svg1.on("click", (event) => {
    if (event.target.tagName === "svg") {
      closeAdditionalCharts("#additional-info-1");
      d3.selectAll("rect").attr("fill", d3.color(barsColor));
      barSelected = false;
    }
  });
};

function createYearsChart(chartType) {
  var svg2Width = +cont2.node().getBoundingClientRect().width;
  var svg2Height = +cont2.node().getBoundingClientRect().height;
  svg2.attr("viewBox", `0 0 ${svg2Width} ${svg2Height}`);

  var yearsToVis = years.sort((a, b) => d3.ascending(a, b));
  yearsToVis = yearsToVis.slice(minYearToVis, maxYearToVis + 1);

  chart2Width = svg2Width - (chart2Margin.right + chart2Margin.left);
  chart2Height = svg2Height - (chart2Margin.top + chart2Margin.bottom);
  var data;
  if (chartType == "types") {
    data = typeByYear;
  }
  else if (chartType == "total") {
    data = gamesByYear;
  }
  const max_count = d3.max(data, (d) => d.games.length);

  xScale2 = d3
    .scaleBand()
    .domain(yearsToVis)
    .range([0, chart2Width])
    .padding(0.2);

  xScaleSubgroups2 = d3
    .scaleBand()
    .domain(types)
    .range([0, xScale2.bandwidth()])
    .padding(0.1);

  yScale2 = d3.scaleLinear()
    .domain([0, max_count])
    .range([chart2Height, 0]);

  colorScaleTypes.domain(types);

  svg2.selectAll("*").remove();

  const legend = svg2.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chart2Margin.left}, 0)`)
    .attr("width", chart2Width)
    .attr("height", typesLegendHeight);

  const innerChart = svg2
    .append("g")
    .attr("class", "chart-group")
    .attr("width", chart2Width)
    .attr("height", chart2Height)
    .attr("transform", `translate(${chart2Margin.left},${chart2Margin.top})`);

  const chartContent = innerChart
    .append("g")
    .attr("class", "chart-content")
    .attr("width", chart2Width)
    .attr("height", chart2Height);

  axisX2 = innerChart
    .append("g")
    .attr("class", "axis-x")
    .attr("transform", `translate(0, ${chart2Height})`)

  axisY2 = innerChart
    .append("g")
    .attr("class", "axis-y")
    .call(d3.axisLeft(yScale2));

  innerChart
    .append("text")
    .attr("class", "axis-title")
    .attr("transform", `translate(${chart2Width / 2}, ${chart2Height + 30})`)
    .style("text-anchor", "middle")
    .text("Release year");

  innerChart
    .append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - 20)
    .attr("x", 0 - chart2Height / 2)
    .style("text-anchor", "middle")
    .text("Number of games");

  createTypesLegend(types);
  updateYearsChart(chartType);
};

function updateYearsChart(chartType) {
  var yearsToVis = years.sort((a, b) => d3.ascending(a, b));
  yearsToVis = yearsToVis.slice(minYearToVis, maxYearToVis + 1);
  var data;
  if (chartType == "types") {
    data = typeByYear.filter(d => selectedTypes.includes(d.type));
  }
  else if (chartType == "total") {
    data = gamesByYear.filter(d => yearsToVis.includes(d.year));
  }

  const max_count = d3.max(data, (d) => d.games.length);

  xScale2.domain(yearsToVis);

  if (chartType == "types") {
    xScaleSubgroups2
      .domain(types)
      .range([0, xScale2.bandwidth()])
  }

  yScale2.domain([0, max_count]);

  var mousemove = function (event, d) {
    tooltip
      .style("left", (event.pageX) + "px")
      .style("top", (event.pageY) + "px");
  }

  const innerChart = svg2.select(".chart-content");
  innerChart.selectAll("*").remove();

  const infoText = d3.select("#additional-info-2 .info-selected-text");
  const infoDefaultText = d3.select("#additional-info-2 .info-default-text");
  var barSelected = false;

  const backgroundRectWidth = xScale2.step();

  const backgroundRects = innerChart.selectAll(".background-rect")
    .data(yearsToVis)
    .join("rect")
    .attr("class", "background-rect")
    .attr("x", (d) => (xScale2(d) - (xScale2.step() - xScale2.bandwidth()) / 2))
    .attr("y", 0)
    .attr("width", backgroundRectWidth)
    .attr("height", chart2Height)
    .attr("fill", (d, i) => (i % 2 == 0 ? "#f0f0f0" : "#f9f9f9"));

  innerChart.append("g").call((g) => g
    .attr('class', 'grid')
    .selectAll('line')
    .data(yScale2.ticks().filter(d => Number.isInteger(d)))
    .join('line')
    .attr('x1', 0)
    .attr('x2', chart2Width)
    .attr('y1', d => yScale2(d))
    .attr('y2', d => yScale2(d))
  );

  if (chartType == "types") {
    svg2.select(".legend").style("visibility", "visible");

    backgroundRects
      .on("mouseover", function (event, d) {
        if (!barSelected) {
          d3.select(event.currentTarget).attr("fill", d3.color("#f0f0f0").darker());
        }
      })
      .on("mouseout", function (event, d) {
        if (!barSelected) {
          backgroundRects.attr("fill", (d, i) => (i % 2 == 0 ? "#f0f0f0" : "#f9f9f9"));
        }
      })
      .on("click", (event, d) => {
        barSelected = true;
        backgroundRects.attr("fill", (d, i) => (i % 2 == 0 ? "#f0f0f0" : "#f9f9f9"));
        d3.select(event.currentTarget).attr("fill", d3.color("#f0f0f0").darker());
        var games = gamesByYear.find(g => g.year == d).games;
        var additionalData = [];
        games.forEach(game => {
          var gameData = dataset.nodes.find(d => d.id == game);
          additionalData.push(gameData);
        });
        infoDefaultText.style("display", "none");
        infoText.style("display", "block").html(`Showing statistics about games released in year <strong>${d} </strong>`);
        showAdditionalCharts(additionalData, attrMainChart = "year", containerId = "#additional-info-2");
      });

    const yearGroups = innerChart.selectAll(".year-group")
      .data(yearsToVis)
      .join("g")
      .attr("class", "year-group")
      .attr("transform", (year) => `translate(${xScale2(year)}, 0)`);


    yearGroups.selectAll("rect")
      .data(year => {
        return selectedTypes.map(type => {
          return data.find(d => d.year == year && d.type == type);
        })
      })
      .join("rect")
      .attr("width", xScaleSubgroups2.bandwidth())
      .attr("height", (d) => chart2Height - yScale2(d.games.length))
      .attr("x", (d) => xScaleSubgroups2(d.type))
      .attr("y", (d) => yScale2(d.games.length))
      .attr("fill", (d) => colorScaleTypes(d.type))
      .on("mouseover", function (event, d) {
        var gameNames = [];
        d.games.forEach(game => {
          let gameData = dataset.nodes.find(g => g.id == game);
          gameNames.push(gameData.title);
        });

        tooltip
          .html(`<strong>Year: ${d.year} <br> Type: ${d.type} <br> Number of games: ${d.games.length} <br> Games:</strong> <br>
        ${gameNames.join("<br>")}`)
          .style("visibility", "visible");
      })
      .on("mousemove", mousemove)
      .on("mouseout", function (event, d) {
        tooltip.style("visibility", "hidden");
      })

  }
  else if (chartType == "total") {
    svg2.select(".legend").style("visibility", "hidden");

    const barGroup = innerChart
      .selectAll(".bar-group")
      .data(data)
      .join("g")
      .attr("class", "bar-group")
      .attr("transform", (d) => `translate(${xScale2(d.year)}, 0)`);

    barGroup
      .append("rect")
      .attr("width", xScale2.bandwidth() - 0.2)
      .attr("height", (d) => chart2Height - yScale2(d.games.length))
      .attr("x", 0)
      .attr("y", (d) => yScale2(d.count))
      .attr("fill", d3.color(colorYearsChart))
      .on("mouseover", function (event, d) {
        tooltip
          .html(`<strong>Year ${d.year} : ${d.count} games </strong>`)
          .style("visibility", "visible");
        if (!barSelected) {
          d3.select(this).attr("fill", d3.color(colorYearsChart).darker());
        }
      })
      .on("mousemove", mousemove)
      .on("mouseout", function (event, d) {
        tooltip.style("visibility", "hidden");
        if (!barSelected) {
          d3.select(this).attr("fill", d3.color(colorYearsChart));
        }
      })
      .on("click", (event, d) => {
        d3.selectAll(".bar-group rect").attr("fill", d3.color(colorYearsChart));
        d3.select(event.currentTarget).attr("fill", d3.color(colorYearsChart).darker());
        var games = d.games;
        var additionalData = [];
        games.forEach(game => {
          var gameData = dataset.nodes.find(d => d.id == game);
          additionalData.push(gameData);
        });
        infoDefaultText.style("display", "none");
        infoText.style("display", "block").html(`Showing statistics about games released in year <strong>${d.year} </strong>`);
        showAdditionalCharts(additionalData, attrMainChart = "year", containerId = "#additional-info-2");
        barSelected = true;
      });

    barGroup
      .append("text")
      .text((d) => d.count)
      .attr("x", xScale2.bandwidth() / 2)
      .attr("y", (d) => yScale2(d.year) - 3)
      .style("font-family", "sans-serif")
      .style("font-size", "9px");
  }

  axisX2.transition()
    .call(d3.axisBottom(xScale2))
    .selectAll("text")
    .style("text-anchor", "center");

  axisY2.transition()
    .call(d3.axisLeft(yScale2)
      .ticks(max_count)
      .tickFormat(d => Number.isInteger(d) ? d : ""));

  svg2.on("click", (event) => {
    if (chartType == "total" && (event.target.tagName === "svg" || event.target.classList.contains("background-rect"))) {
      closeAdditionalCharts("#additional-info-2");
      d3.selectAll(".bar-group rect").attr("fill", d3.color(colorYearsChart));
      barSelected = false;
    }
    if (chartType == "types" && event.target.tagName === "svg") {
      closeAdditionalCharts("#additional-info-2");
      backgroundRects.attr("fill", (d, i) => (i % 2 == 0 ? "#f0f0f0" : "#f9f9f9"));
      barSelected = false;
    }
  });
}

function createTypesLegend(types) {

  const legend = svg2.select(".legend");
  legend.style("visibility", "visible");
  legend.selectAll("*").remove();

  legend.append("text")
    .attr("x", 0)
    .attr("y", 20)
    .attr("font-size", "15")
    .attr("text-anchor", "start")
    .text("Click on the legend to show/hide specific types");

  let legendX = 0;
  types.forEach((type, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(${legendX}, 30)`)
      .attr("class", "legend-item")
      .style("cursor", "pointer")
      .on("click", function () {
        if (selectedTypes.includes(type)) {
          selectedTypes = selectedTypes.filter(t => t !== type);
        } else {
          selectedTypes.push(type);
        }
        updateYearsChart(chartType = "types");
        closeAdditionalCharts("#additional-info-2");
        d3.select(this).select("rect").attr("fill", selectedTypes.includes(type) ? colorScaleTypes(type) : "#ccc");
      });

    legendItem.append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", selectedTypes.includes(type) ? colorScaleTypes(type) : "#ccc");

    legendItem.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("font-size", "13px")
      .attr("text-anchor", "start")
      .text(type);

    legendX += legendItem.node().getBBox().width + 10;
  });
}

function closeAdditionalCharts(containerId) {
  d3.select(containerId + " .info-selected-text").style("display", "none");
  d3.select(containerId + " .info-default-text").style("display", "block");
  d3.select(containerId + " .chart-selector").style("display", "none");
  d3.select(containerId + " .chart-content").style("display", "none");
  d3.select(containerId + " .show-all-selector").style("display", "none");
  d3.select(containerId + " .info-add-text").style("display", "none");
}

window.addEventListener("resize", () => {
  if (currentTab == "tab-1") {
    const attr = attrSelector1.property("value");

    svg1Height = (window.innerHeight * 0.8);
    svg1Width = cont1.node().getBoundingClientRect().width;
    svg1.attr("viewBox", `0 0 ${svg1Width} ${svg1Height}`);
    createBarchart1(attr, "name", "count");
    closeAdditionalCharts("#additional-info-1");

  } else if (currentTab == "tab-2") {
    var value = d3.selectAll("input[name='chart-type']:checked").property("value");
    createYearsChart(value);
    closeAdditionalCharts("#additional-info-2");
  }
});
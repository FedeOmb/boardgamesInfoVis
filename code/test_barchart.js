var cont = d3.select(".svg-container");
var width = +cont.node().getBoundingClientRect().width;
var height = +cont.node().getBoundingClientRect().height;

var activeTab = 1;

var ages = [];
var categories = [];
var mechanics = [];
var designers = [];
var dataset = {};

var maxItemsToVis = 10;

const svg1 = d3
  .select("#bar-chart-1")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const svg2 = d3
  .select("#bar-chart-2")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const svg3 = d3
  .select("#bar-chart-3")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

  const attrList = ["categories", "mechanics"];
  const attrSelector = d3.select("#select-attribute-1");
  const rangeSlider = d3.select("#max-items-1");
  const rangeValue = d3.select("#range-value-1");

loadDatasets();

  //--- controlli tab 1 ----
  //aggiungi opzioni attributi al selettore
  attrSelector.selectAll("option")
    .data(attrList)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d)
    .property("selected", (d) => d == "categories");

  //listener per cambio attributo
  attrSelector.on("change", () => {
    const attr = attrSelector.property("value");
      if(attr == "categories"){
        maxItemsToVis = categories.length;
        rangeSlider.attr("max", maxItemsToVis)
        rangeSlider.attr("value", maxItemsToVis)
        rangeValue.text(maxItemsToVis.toString())
        createBarchart1(categories, "name", "count");
      }if(attr == "mechanics"){
        maxItemsToVis = mechanics.length;
        rangeSlider.attr("max", maxItemsToVis)
        rangeSlider.attr("value", maxItemsToVis)
        rangeValue.text(maxItemsToVis.toString())
        createBarchart1(mechanics, "name", "count");
      }
    });

    //listener per modifica slider
    rangeSlider.on("change", () => {
      maxItemsToVis = rangeSlider.property("value");
      rangeValue.text(maxItemsToVis.toString())
      attr = attrSelector.property("value");
      if(attr == "categories"){
        createBarchart1(categories, "name", "count");
      }if(attr == "mechanics"){
        createBarchart1(mechanics, "name", "count");
      }
    })

  //---controlli tab2 ---
const agesBtn = d3.select("#view-ages");
agesBtn.on("change", () => {
  if(agesBtn.property("checked")){
    maxItemsToVis = ages.length;
    rangeSlider.attr("max", maxItemsToVis)
    rangeSlider.attr("value", maxItemsToVis)
    rangeValue.text(maxItemsToVis.toString())
    createBarchart1(ages, "age", "count");
  }
});


//vers6 di d3 funziona solo con d3.json().then()

async function loadDatasets(){

  Promise.all([
    d3.json("data/dataset_converted_cleaned.json"),
    d3.json("data/categories.json"),
    d3.json("data/mechanics.json"),
    d3.json("data/designers.json")
  ]).then(([data, catData, mecData, desData]) =>{

    calcAges(data);
    calcGamesYears(data);
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

    maxItemsToVis = categories.length;
    rangeSlider.attr("max", maxItemsToVis)
    rangeSlider.attr("value", maxItemsToVis)
    rangeValue.text(maxItemsToVis.toString())
    createBarchart1(categories, "name", "count");
 
  });

}

function calcAges(data) {
  console.log(data);
  
  data.nodes.forEach(d => {
      d.age = 2023 - d.year;
  });


  data.nodes.forEach(game => {
      const age = game.age;

      let ageEntry = ages.find(d => d.age == age)
      if (!ageEntry) {
        ageEntry = { 
          age: age,
          games: []
        };
          ages.push(ageEntry);
      }
      ageEntry.games.push(game.id);
    });

  ages.forEach(game => {
    game.count = game.games.length;
  })

  ages = d3.sort(ages, (a, b) => d3.descending(a.count, b.count));

  console.log("ages",ages);
}


function calcGamesYears(data){

  const yearsCateg = [];

  data.nodes.forEach(game => {
      const year = game.year;
      let yearEntry = yearsCateg.find(d => d.year == year)
      if (!yearEntry) {
        yearEntry = { 
          year: year,
          count: 0
        };
          yearsCateg.push(yearEntry);
      }
  
      const gameCategories = game.categories.map(c => c.name);
      
      gameCategories.forEach(category => {
        let yearEntry = yearsCateg.find(d => d.year == year)
        if (!yearEntry[category]) {
          yearEntry[category] = [];
        }
        yearEntry[category].push(game.id);

      });
      yearEntry.count++;
  });
  console.log(yearsCateg)
}

function createVertBarchart(data){

  const chartMargin = { top: 20, right: 20, bottom: 100, left: 40 };
  const chartWidth = width - (chartMargin.right + chartMargin.left);
  const chartHeight = height - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d.count);

  //definizione scale per gli assi
  const yScale = d3.scaleLinear().domain([0, max_count]).range([chartHeight, 0]);
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.name))
    .range([0, chartWidth])
    .padding(0.2);

  svg.selectAll("*").remove();
    
  const innerChart = svg
    .append("g")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`)
      
    //il join() funziona solo dalla vers6 di d3

    // gruppo rect + label interna
  const barAndLabel = innerChart
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(${xScale(d.name)}, 0)`);

  barAndLabel
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => chartHeight - yScale(d.count))
    .attr("x", 0)
    .attr("y", (d) => yScale(d.count))
    .attr("fill", "teal");
  
  barAndLabel
    .append("text")
    .text((d) => d.count)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", (d) => yScale(d.count) - 3)
    .style("text-anchor", "middle")
    .style("font-family", "sans-serif")
    .style("font-size", "9px");

    //aggiunta assi
  innerChart
    .append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", `translate(-10,0) rotate(-45)`)
    .style("text-anchor", "end")

  innerChart
    .append("g")
    .call(d3.axisLeft(yScale))
    
}

function createBarchart1(dataToVis, varY, varX){

  data = dataToVis.slice(0, maxItemsToVis);

  const chartMargin = { top: 20, right: 20, bottom: 20, left: 120 };
  const chartWidth = width - (chartMargin.right + chartMargin.left);
  const chartHeight = height - (chartMargin.top + chartMargin.bottom);
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

  // gruppo rect + label interna
  const barAndLabel = innerChart
    .selectAll("g")
    .data(data)
    .join("g")
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
};

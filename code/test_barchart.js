//container = document.getElementById("chart-container");

const width =  window.innerWidth * 0.7;
const height = Math.max(1080, window.innerHeight);

var ages = [];
var categories = [];
var mechanics = [];
var designers = [];
var dataset = {};

const svg = d3
  .select("#bar-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)

const attrList = ["categories", "mechanics"];
const attrSelector = d3.select("#select-attribute");

//aggiungi opzioni attributi al selettore
attrSelector.selectAll("option")
  .data(attrList)
  .join("option")
  .attr("value", (d) => d)
  .text((d) => d)
  .property("selected", (d) => d == "categories");

loadDatasets();

//listener per cambio attributo
attrSelector.on("change", () => {
  const attr = attrSelector.property("value");
  const viewMode = document.querySelector(
    'input[name="barchart-type"]:checked'
  ).value;
  if(attr == "categories"){
    createHorizBarchart(categories, "name", "count");
  }if(attr == "mechanics"){
    createHorizBarchart(mechanics, "name", "count");
  }
});

const agesBtn = d3.select("#view-ages");
agesBtn.on("click", () => {
  if(ages.length != 0){
  createHorizBarchart(ages, "age", "count");
  }
});

//vers6 di d3 funziona solo con d3.json().then()

async function loadDatasets(){
  d3.json("data/dataset_converted_cleaned.json").then( (data) =>{
    console.log(data);
    dataset = data;
    console.log("fulldataset",dataset);
    calcAges();
    createHorizBarchart(categories, "name", "count");
  });
  d3.json("data/categories.json").then( (data) =>{
    data.forEach( d => {
      d.count = d.games.length
    });
    data = d3.sort(data, (a, b) => d3.descending(a.count, b.count))
    categories = data;
    console.log("categories",categories);
  });
  d3.json("data/mechanics.json").then( (data) =>{
    data.forEach( d => {
      d.count = d.games.length
    });
    data = d3.sort(data, (a, b) => d3.descending(a.count, b.count))
    mechanics = data;
    console.log("mechanics",mechanics);

  });
  d3.json("data/designers.json").then( (data) =>{
    data.forEach( d => {
      d.count = d.games.length
    });
    data = d3.sort(data, (a, b) => d3.descending(a.count, b.count))
    designers = data;
    console.log("designers",designers);

  });

}

function calcAges(){
    console.log(dataset);
    var present = false
    dataset.nodes.forEach( d => {
      d.age = 2023 - d.year;
      //console.log(d.age);
    });

    for(let i in dataset.nodes){
        for(let j in ages){
            present = false
            if(dataset.nodes[i].age == ages[j].age){
              present = true
            }
        }
        if(!present){
          let temp = {}
          temp.age = dataset.nodes[i].age
          temp.games = []
          ages.push(temp)
      }
    }
    for(let j in ages){
        for(let i in dataset.nodes){
          if(dataset.nodes[i].age == ages[j].age)
            ages[j].games.push(dataset.nodes[i].id)
        }
        ages[j].count = ages[j].games.length;
      }
    console.log(ages);
    ages = d3.sort(ages, (a, b) => d3.descending(a.count, b.count))
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
    
};

function createHorizBarchart(data, varY, varX){
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

  svg.selectAll("*").remove();

  const innerChart = svg
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

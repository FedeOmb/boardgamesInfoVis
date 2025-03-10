//container = document.getElementById("chart-container");

const width =  window.innerWidth * 0.7;
const height = window.innerHeight ;

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

loadDataset("data/categories.json")

//listener per cambio attributo
attrSelector.on("change", () => {
  const attr = attrSelector.property("value");
  const viewMode = document.querySelector(
    'input[name="barchart-type"]:checked'
  ).value;
  if(attr == "categories"){
    loadDataset("data/categories.json")
  }else{
    loadDataset("data/mechanics.json")
  }
});

//vers6 di d3 funziona solo con d3.json().then()

function loadDataset(dataset){
  d3.json(dataset).then( (data) =>{
    console.log(data);
    var new_data = [];
    data.forEach( d => {
        new_data.push(
            {
                id : d.id,
                name: d.name,
                count: d.games.length
            }
        )
    });
    console.log(new_data);
    
    new_data = d3.sort(new_data, (a, b) => d3.descending(a.count, b.count))

    //createVertBarchart(new_data);

    createHorizBarchart(new_data);
  })
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

function createHorizBarchart(data){
  const chartMargin = { top: 20, right: 20, bottom: 20, left: 120 };
  const chartWidth = width - (chartMargin.right + chartMargin.left);
  const chartHeight = height - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d.count);
  
  //definizione scale per gli assi
  const xScale = d3.scaleLinear().domain([0, max_count]).range([0, chartWidth]);
  const yScale = d3
  .scaleBand()
  .domain(data.map((d) => d.name))
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
    .attr("transform", (d) => `translate(0, ${yScale(d.name)})`);

  barAndLabel
    .append("rect")
    .attr("width", (d) => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", "teal");

  barAndLabel
    .append("text")
    .text((d) => d.count)
    .attr("x", (d) => xScale(d.count) + 3)
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

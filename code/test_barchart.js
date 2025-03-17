var cont = d3.select(".svg-container");
var width = +cont.node().getBoundingClientRect().width;
var height = +cont.node().getBoundingClientRect().height;

var activeTab = 1;

var ages = [];
var categories = [];
var mechanics = [];
var designers = [];
var dataset = {};
var categByYear = [];
var typeByYear = [];

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

  var maxItemsToVis1 = 10;
  var maxItemsToVis2 = 10;
  var maxItemsToVis3 = 10;
  const attrList1 = ["categories", "mechanics"];
  const attrSelector1 = d3.select("#select-attribute-1");
  const rangeSlider1 = d3.select("#max-items-1");
  const rangeValue1 = d3.select("#range-value-1");

  const orderSelection2 = d3.selectAll("input[name='order-type']");
  const rangeSlider2 = d3.select("#max-items-2");
  const rangeValue2 = d3.select("#range-value-2");

  const rangeSlider3 = d3.select("#max-items-3");
  const rangeValue3 = d3.select("#range-value-3");

  //--- controlli tab 1 ----
  //aggiungi opzioni attributi al selettore
  attrSelector1.selectAll("option")
    .data(attrList1)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d)
    .property("selected", (d) => d == "categories");

  //listener per cambio attributo
  attrSelector1.on("change", () => {
    const attr = attrSelector1.property("value");

    maxItemsToVis1 = window[attr].length;
    rangeSlider1.attr("max", maxItemsToVis1)
    rangeSlider1.attr("value", maxItemsToVis1)
    rangeValue1.text(maxItemsToVis1.toString())
    createBarchart1(window[attr], "name", "count");
    });

    //listener per modifica slider
    rangeSlider1.on("change", () => {
      maxItemsToVis1 = rangeSlider1.property("value");
      rangeValue1.text(maxItemsToVis1.toString())
      attr = attrSelector1.property("value");
      createBarchart1(window[attr], "name", "count");
    })

  //---controlli tab2 ---

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

  //---controlli tab3 ---
  rangeSlider3.on("change", () => {
    maxItemsToVis3 = rangeSlider3.property("value");
    rangeValue3.text(maxItemsToVis3.toString())
    createBarchart3(typeByYear);
  })

loadDatasets();

function updateTab(tabName){
  if(tabName == "tab-1"){
    const attr = attrSelector1.property("value");
    createBarchart1(window[attr], "name", "count");
  }
  if(tabName == "tab-2"){
    maxItemsToVis2 = ages.length;
    rangeSlider2.attr("max", maxItemsToVis2)
    rangeSlider2.attr("value", maxItemsToVis2)
    rangeValue2.text(maxItemsToVis2.toString());
    createBarchart2(ages, "count", "age");
  }
  if(tabName == "tab-3"){
    maxItemsToVis3 = [...new Set(typeByYear.map(d => d.year))].length;
    rangeSlider3.attr("max", maxItemsToVis3)
    rangeSlider3.attr("value", maxItemsToVis3)
    rangeValue3.text(maxItemsToVis3.toString());
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

    calcAges(data);
    calcCategByYears(data);
    calcTypeByYears2(data);
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

    maxItemsToVis1 = categories.length;
    rangeSlider1.attr("max", maxItemsToVis1)
    rangeSlider1.attr("value", maxItemsToVis1)
    rangeValue1.text(maxItemsToVis1.toString())
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


function calcCategByYears(data){

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
  categByYear = yearsCateg;
}


/*function calcTypeByYears(data){

  const yearsType = [];

  data.nodes.forEach(game => {
      const year = game.year;
      let yearEntry = yearsType.find(d => d.year == year)
      if (!yearEntry) {
        yearEntry = { 
          year: year,
          count: 0
        };
          yearsType.push(yearEntry);
      }
  
      const gameTypes = game.type;
      
      gameTypes.forEach(type => {
        let yearEntry = yearsType.find(d => d.year == year)
        if (!yearEntry[type]) {
          yearEntry[type] = [];
        }
        yearEntry[type].push(game.id);

      });
      yearEntry.count++;
  });
  console.log(yearsType)
  typeByYear = yearsType;
}
*/

function calcTypeByYears2(data){

  var types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  console.log(types);

  const yearsType = [];

  data.nodes.forEach(game => {
      const year = game.year;
      types.forEach(t => {
        let yearEntry = yearsType.find(d => (d.year == year && d.type == t));
        if(!yearEntry){
          yearEntry = { 
            year: year,
            type: t,
            games: []
          };
            yearsType.push(yearEntry);
        }
      })
      game.type.forEach(t => {
        let entry = yearsType.find(d => (d.year == year && d.type == t));
        entry.games.push(game.id);
      })

      });

      console.log(yearsType)
      typeByYear = yearsType;

  };



function createBarchart1(dataToVis, varY, varX){

  var data = dataToVis.slice(0, maxItemsToVis1);

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

function createBarchart2(dataToVis, varY, varX){

  var data = dataToVis.slice(0, maxItemsToVis2);

  const chartMargin = { top: 20, right: 20, bottom: 100, left: 100 };
  const chartWidth = width - (chartMargin.right + chartMargin.left);
  const chartHeight = height - (chartMargin.top + chartMargin.bottom);
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
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`)

  // gruppo rect + label interna
  const barAndLabel = innerChart
    .selectAll("g")
    .data(data)
    .join("g")
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

  var data = dataToVis; 
  var years = [...new Set(data.map(d => d.year))];
  years = years.sort((a, b) => d3.ascending(a, b));
  console.log(years);
  const types = [...new Set(data.map(d => d.type))]; 
  console.log(types);
  years = years.slice(0, maxItemsToVis3);
  
  const chartMargin = { top: 20, right: 20, bottom: 100, left: 50 };
  const chartWidth = width - (chartMargin.right + chartMargin.left);
  const chartHeight = height - (chartMargin.top + chartMargin.bottom);
  const max_count = d3.max(data, (d) => d.games.length);
  
  //definizione scale per gli assi

  const xScale = d3
  .scaleBand()
  .domain(years)
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

  const innerChart = svg3
    .append("g")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`)

  // gruppo rect per anno
  const yearGroups = innerChart
    .selectAll(".year-group")
    .data(years)
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

  const legend = svg3
    .append("g")
    .attr("transform", `translate(${chartWidth - 150}, ${chartMargin.top})`);

    types.forEach((type, i) => {
      const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(type));

      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("font-size", "12px")
        .attr("text-anchor", "start")
        .text(type);
      });
};
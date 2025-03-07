const width = 1000;
const height = 1000;
const svg = d3
  .select("#bar-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

  //vers6 di d3 funziona solo con d3.json().then()
d3.json("data/categories.json").then( (data) =>{
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
    //data.sort((a, b) => b.count - a.count);
    new_data = d3.sort(new_data, (a, b) => d3.descending(a.count, b.count))
    //createVertBarchart(new_data);
    createHorizBarchart(new_data);
  })

const createVertBarchart = (data) => {
    const max_count = d3.max(data, (d) => d.count);
  const yScale = d3.scaleLinear().domain([0, max_count]).range([700, 0]);
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.id))
    .range([0, 1000])
    .padding(0.2);

    //il join() funziona solo dalla vers6 di d3
  const barAndLabel = svg
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(${xScale(d.id)}, 0)`);

  barAndLabel
    .append("rect")
    .attr("width", (d) => xScale.bandwidth())
    .attr("height", (d) => 700 - yScale(d.count))
    .attr("x", 20)
    .attr("y", (d) => yScale(d.count))
    .attr("fill", "teal");

  barAndLabel
    .append("text")
    .text((d) => d.name)
    .attr("text-anchor", "end")
    .attr("x", (d) => 20 + xScale.bandwidth() / 2)
    .attr("y", 720)
    .attr("transform", (d) => `rotate(-45, ${20 + xScale.bandwidth() / 2}, 720)`)
    .style("font-family", "sans-serif")
    .style("font-size", "11px");

  barAndLabel
    .append("text")
    .text((d) => d.count)
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", (d) => yScale(d.count))
    .style("font-family", "sans-serif")
    .style("font-size", "9px");

  svg
    .append("line")
    .attr("x1", 0)
    .attr("y1", 700)
    .attr("x2", 1000)
    .attr("y2", 700)
    .attr("stroke", "black");
};

const createHorizBarchart = (data) => {
  const max_count = d3.max(data, (d) => d.count);
const xScale = d3.scaleLinear().domain([0, max_count]).range([0, 700]);
const yScale = d3
  .scaleBand()
  .domain(data.map((d) => d.id))
  .range([0, 1000])
  .padding(0.2);

  //il join() funziona solo dalla vers6 di d3
const barAndLabel = svg
  .selectAll("g")
  .data(data)
  .join("g")
  .attr("transform", (d) => `translate(0, ${yScale(d.id)})`);

barAndLabel
  .append("rect")
  .attr("width", (d) => xScale(d.count))
  .attr("height", (d) => yScale.bandwidth())
  .attr("x", 100)
  .attr("y", 0)
  .attr("fill", "teal");

barAndLabel
  .append("text")
  .text((d) => d.name)
  .attr("text-anchor", "end")
  .attr("x", 96)
  .attr("y", 12)
  .style("font-family", "sans-serif")
  .style("font-size", "11px");

barAndLabel
  .append("text")
  .text((d) => d.count)
  .attr("x", (d) => 100 + xScale(d.count) + 4)
  .attr("y", 12)
  .style("font-family", "sans-serif")
  .style("font-size", "9px");

svg
  .append("line")
  .attr("x1", 100)
  .attr("y1", 0)
  .attr("x2", 100)
  .attr("y2", 1000)
  .attr("stroke", "black");
};

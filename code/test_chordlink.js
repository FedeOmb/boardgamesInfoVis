var data = {}
d3.json("./data/dataset_converted_cleaned.json", function (error, _graph) {
    if (error) throw error;
    data = _graph
            
    // Prepare data for the chord diagram
    const nodes = data.nodes.map(d => d.id);
    const nodeMap = new Map(nodes.map((id, i) => [id, i]));

    // Create a matrix for the chord diagram
    const matrix = Array.from({ length: nodes.length }, () => 
        Array.from({ length: nodes.length }, () => 0)
    );

    data.links.forEach(link => {
        const sourceIndex = nodeMap.get(link.source);
        const targetIndex = nodeMap.get(link.target);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
            matrix[sourceIndex][targetIndex] += 1;
        }
    });

    // Set up the chord diagram
    const width = 800;
    const height = 800;
    const outerRadius = Math.min(width, height) * 0.5 - 40;
    const innerRadius = outerRadius - 30;

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
        .radius(innerRadius);

    const chords = chord(matrix);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    svg.append("g")
        .selectAll("path")
        .data(chords)
        .enter()
        .append("path")
        .attr("d", ribbon)
        .style("fill", d => color(d.source.index))
        .style("stroke", d => d3.rgb(color(d.source.index)).darker());

    svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .enter()
        .append("g")
        .append("path")
        .attr("d", arc)
        .style("fill", d => color(d.index))
        .style("stroke", d => d3.rgb(color(d.index)).darker());
})
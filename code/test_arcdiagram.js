const width = 1000;
const height = 600;
const margin = { top: 20, bottom: 20 };

// Caricamento dati
d3.json('data/dataset_converted_cleaned_v2.json').then(data => {
    const nodes = data.nodes.sort((a, b) => a.rank - b.rank); // Ordinamento per rank
    const links = data.links;

    // Creazione scala x per posizionare i nodi
    const xScale = d3.scalePoint()
      .domain(nodes.map(d => d.id))
      .range([50, width - 50]);

    // Creazione SVG
    const svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

    // Disegnare gli archi
    svg.selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', d => {
        const x1 = xScale(d.source);
        const x2 = xScale(d.target);
        const r = Math.abs(x2 - x1) / 2;
        const y = height / 2;
        return `M${x1},${y} A${r},${r} 0 0,1 ${x2},${y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#69b3a2')
      .attr('stroke-width', 1);

    // Disegnare i nodi
    svg.selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.id))
      .attr('cy', height / 2)
      .attr('r', 5)
      .attr('fill', '#ff5733');
  });

// Funzioni zoom
d3.select("#zoom-in").on("click", function() {
    svg.transition().call(zoom.scaleBy, 1.2);
  });
  d3.select("#zoom-out").on("click", function() {
    svg.transition().call(zoom.scaleBy, 0.8);
  });
  d3.select("#zoom-reset").on("click", function() {
    svg.transition().call(zoom.transform, d3.zoomIdentity);
});

// Function to handle mouseover node event
function handleMouseOver(d) {
    if (!infoPanelVisible) {
      // Highlight the hovered node
      node.each(function(n) {
        d3.select(this).selectAll("circle, path").attr("opacity", 0.4);
      });
  
      link.each(function(l) {
        d3.select(this).attr("opacity", 0.4);
      });
  
      // Highlight the hovered node's circle or paths
      d3.select(this)
        .selectAll("circle, path")
        .attr("stroke", "DarkSlateGrey")
        .attr("stroke-width", 2)
        .attr("opacity", 1);
  
      // Highlight adjacent nodes
      node.each(function(n) {
        if (isAdjacent(d, n)) {
          d3.select(this)
            .selectAll("circle, path")
            .attr("stroke", "DarkSlateGrey")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 1)
            .attr("opacity", 1);
        }
      });
  
      // Highlight adjacent links
      link.each(function(l) {
        if (l.source === d || l.target === d) {
          d3.select(this)
            .attr("stroke", "DarkSlateGrey")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 1)
            .attr("opacity", 1);
        }
      });
    }
  
    // Show tooltip
    tooltip.html(`<strong>${d.rank}°: ${d.title} <br>Type: ${d.type}</strong><br>`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px")
      .style("visibility", "visible");
}

function handleMouseOut(d) {
    if (!infoPanelVisible) {
      // Unhighlight the hovered node
      d3.select(this)
        .selectAll("circle, path")
        .attr("stroke", "grey")
        .attr("stroke-width", 1);
  
      // Unhighlight adjacent nodes
      node.each(function(n) {
        if (isAdjacent(d, n)) {
          d3.select(this)
            .selectAll("circle, path")
            .attr("stroke", "grey")
            .attr("stroke-width", 1);
        }
      });
  
      // Unhighlight adjacent links
      link.each(function(l) {
        if (l.source === d || l.target === d) {
          d3.select(this)
            .attr("stroke", "#999")
            .attr("stroke-width", 1);
        }
      });
  
      resetNetColors();
    }
  
    // Hide tooltip
    tooltip.style("visibility", "hidden");
  }

function mouseEnterEdge(d) {
    const sourceNode = graph.nodes.find(n => n.id === (d.source.id || d.source));
    const targetNode = graph.nodes.find(n => n.id === (d.target.id || d.target));
  
    if (!sourceNode || !targetNode) return;
  
    const sourceCategories = new Set(sourceNode.categories?.map(c => c.name) || []);
    const targetCategories = new Set(targetNode.categories?.map(c => c.name) || []);
    const commonCategories = [...sourceCategories].filter(c => targetCategories.has(c));
  
    if (!infoPanelVisible) {
      // Highlight edge
      d3.select(this)
        .attr("stroke", "lime")
        .attr("stroke-width", 3);
  
      // Highlight source and target nodes
      node.select(function(n) {
        return n === d.source || n === d.target ? this : null;
      })
        .selectAll("circle, path")
        .attr("stroke", "lime")
        .attr("stroke-width", 3);
    }
  
    // Show tooltip
    tooltip.transition().duration(200).style("opacity", 0.9);
  
    if (commonCategories.length > 0) {
      if (isBidirectional(sourceNode.id, targetNode.id)) {
        tooltip.html(`<strong>${d.source.title} ↔ ${d.target.title}</strong><br>${commonCategories}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("visibility", "visible");
      } else {
        tooltip.html(`<strong>${d.source.title} → ${d.target.title}</strong><br>${commonCategories}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("visibility", "visible");
      }
    } else {
      tooltip.html(`<strong>${d.source.title} → ${d.target.title}</strong><br>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");
    }
  }

//handle mouseout edge
function mouseLeaveEdge(d) {
    if (!infoPanelVisible) {
      // Unhighlight edge
      d3.select(this)
        .attr("stroke", "grey")
        .attr("stroke-width", 1);
  
      // Unhighlight source and target nodes
      node.select(function(n) {
        return n === d.source || n === d.target ? this : null;
      })
        .selectAll("circle, path")
        .attr("stroke", "grey")
        .attr("stroke-width", 1);
    }
  
    // Hide tooltip
    tooltip.style("visibility", "hidden");
  }

function handleNodeClick(d) {
    
    infoPanelVisible = true;
    
    d3.select("body").classed("panel-open", true);
    d3.select("#info-panel").style("display", "block");

    infoPanelVisible = true;
    resetNetColors();
    networkGroup.selectAll("line").attr("opacity", 0.4);
    networkGroup.selectAll("circle, path").attr("opacity", 0.4);

    // Highlight adjacent nodes
    node.each(function(n) {
        if (isAdjacent(d, n)) {
        d3.select(this)
            .selectAll("circle, path")
            .attr("stroke", "DarkSlateGrey")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 1)
            .attr("opacity", 1);
        }
    });

    // Highlight adjacent links
    link.each(function(l) {
        if (l.source === d || l.target === d) {
        d3.select(this)
            .attr("stroke", "DarkSlateGrey")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 1)
            .attr("opacity", 1);
        }
    });

    // Highlight the clicked node
    const clickedNode = d3.select(this);
    clickedNode.selectAll("circle, path")
        .attr("stroke", "DarkSlateGrey")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 1)
        .attr("opacity", 1);

    // Set fill to black for the clicked node
    if (d.type.length === 1) {
        // For single-colored nodes (circle)
        clickedNode.select("circle")
        .attr("fill", "black");
    } else if (d.type.length === 2) {
        // For bicolored nodes (paths)
        clickedNode.selectAll("path")
        .attr("fill", "black");
    }
  
    // Write game information
    var fans_liked = graph.links
    .filter(l => l.source.id === d.id)
    .map(l => graph.nodes.find(n => n.id === l.target.id).title);
    var colorScale = d3.scaleOrdinal().domain(types).range(custColDesaturated);
    d3.select("#node-header").style("background", colorScale(d.type[0]))
    d3.select("#game-title").text(d.title);
    d3.select("#game-rank").html(`<strong>Rank:</strong> ${d.rank}`);
    d3.select("#node-header").select(".info-row:nth-child(3) .info-value").text(d.year);
    d3.select("#node-header").select(".info-row:nth-child(4) .info-value")
      .text(d.categories.map(c => c.name).join(", "));
    d3.select("#node-header").select(".info-row:nth-child(5) .info-value")
      .text(d.mechanics.map(m => m.name).join(", "));
    d3.select("#node-header").select(".info-row:nth-child(6) .info-value")
      .text(d.type.map(t => t).join(", "));
    d3.select("#node-header").select(".info-row:nth-child(7) .info-value")
      .text(d.designer.map(des => des.name).join(", "));
    d3.select("#node-header").select(".info-row:nth-child(8) .info-value")
      .text(fans_liked.join(", "));
  
    // Adjust SVG size and redraw hull if necessary
    svg.transition()
        .duration(150)
        .style("flex-basis", "70%")
        .on("end", function() {
            width = +svg.node().getBoundingClientRect().width;
            height = +svg.node().getBoundingClientRect().height;
            updateSize(); // Update the simulation and center force
        });
  
    if (activeHull !== null) {
      const hull = computeSingleHull(graph.nodes, activeHull);
      drawSingleHull(svg, hull, activeHull);
    }
  
    d3.select("#node-details").html("");
    d3.select("#info-panel").style("position", "relative");
  
    d3.select("#close-info-panel").on("click", () => {
      d3.select("#info-panel").style("display", "none");
      infoPanelVisible = false;
      d3.select("body").classed("panel-open", false);
      svg.style("flex-basis", "100%");
      width = +svg.node().getBoundingClientRect().width;
      height = +svg.node().getBoundingClientRect().height;
      updateSize();
      resetNetColors();
      if (activeHull !== null) {
        const hull = computeSingleHull(graph.nodes, activeHull);
        drawSingleHull(svg, hull, activeHull);
      }
    });
  
    d3.select("#chart-content").html("");
    const neighbors = graph.links
      .filter(l => l.source.id === d.id)
      .map(l => graph.nodes.find(n => n.id === l.target.id));
    const data = [d, ...neighbors];
    data.sort((a, b) => d3.descending(a.minage, b.minage));
    d3.selectAll(".chart-btn").classed("active", false);
  
    d3.selectAll(".chart-btn").on("click", function() {
      const chartType = d3.select(this).attr("data-chart");
      d3.selectAll(".chart-btn").classed("active", false);
      d3.select(this).classed("active", true);
      d3.select("#chart-content").html("");
      if (chartType === "minage") {
        data.sort((a, b) => d3.descending(a.minage, b.minage));
        createMinAgeChart(data);
      } else if (chartType === "players") {
        data.sort((a, b) => d3.descending(a.minplayers, b.minplayers));
        createDumbbellChart(data, "minplayers", "maxplayers", "#chart-content", "Players", neighbors.length);
      } else if (chartType === "playtime") {
        data.sort((a, b) => d3.descending(a.minplaytime, b.minplaytime));
        createDumbbellChart(data, "minplaytime", "maxplaytime", "#chart-content", "Playtime (min)", neighbors.length);
      } else if (chartType === "categories") {
        createCategoriesChart(data);
      }
    });
}
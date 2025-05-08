svg = d3.select("svg");
var clickedNode = null;

//zoom buttons
d3.select("#zoom-in").on("click", function() {
    svg.transition().call(zoom.scaleBy, 1.2);
  });
  d3.select("#zoom-out").on("click", function() {
    svg.transition().call(zoom.scaleBy, 1/1.2);
  });
  d3.select("#zoom-reset").on("click", function() {
    if(infoPanelVisible){
      svg.transition().call(zoom.scaleTo, 1);
    }else
      svg.transition().call(zoom.transform, d3.zoomIdentity);
});

//show labels controls
d3.select("#toggle-labels").on("click", function() {
  labelsVisible = !labelsVisible;
  d3.select(this).text(labelsVisible ? "Hide Labels" : "Show Labels");
  if(infoPanelVisible && labelsVisible && clickedNode){
    d3.selectAll(".node-label").style("display", function(d) {
      const nodeElement = d3.selectAll(".node").filter(n => n.id === d.id);
      return isAdjacent(clickedNode.datum(), nodeElement.datum()) || isBidirectional(clickedNode.datum().id, d.id)|| clickedNode.datum().id === d.id ? "block" : "none";
    });
  }else{
    d3.selectAll(".node-label").style("display", labelsVisible ? "block" : "none");
  }
});

//search bar selection
d3.select("#search-box").on("change", function() {
  const selectedTitle = this.value;
  const nodeId = titleToIdMap[selectedTitle];
  if (nodeId) {
    openNodeById(nodeId); 
  } else {
    alert("Game not found. Ensure that you select a valid title.");
  }
});

//Functions to adjust the position of markers when links are highlighted
function adjustMarkerEnd(strokeWidth) {
  const marker = d3.select(`#arrow-end`);
  marker.attr("refX", 7 + (strokeWidth)); 
  return "url(#arrow-end)";
}
function adjustMarkerStart(strokeWidth) {
    const marker = d3.select(`#arrow-start`);
    marker.attr("refX", 1 - (strokeWidth )); 
    return "url(#arrow-start)";
}

//handle mouseover node event
function handleMouseOver(event, d) {
  
  if (!infoPanelVisible) {
    node.selectAll("circle, path").attr("opacity", 0.5);
    link.attr("opacity", 0.3);

    d3.select(this)
      .selectAll("circle, path")
      .attr("stroke", "DarkSlateGrey")
      .attr("stroke-width", 2)
      .attr("opacity", 1);

    link.each(function (l) {
      if (isBidirectional(l.source.id, l.target.id) && (l.source === d || l.target === d)) {
        d3.select(this)
          .attr("stroke", "DarkSlateGrey")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .attr("marker-end", function(){
            return adjustMarkerEnd(2);
          })
          .attr("marker-start", function(){
            return adjustMarkerStart(2);
          }); 
      } else if (l.source === d) {
        d3.select(this)
          .attr("stroke", "DarkSlateGrey")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .attr("marker-end", function(){
            return adjustMarkerEnd(2);
          })
          .attr("marker-start", null);
      }
    });

    node.each(function (n) {
      if (isAdjacent(d, n) || isBidirectional(d.id, n.id)) {
        d3.select(this)
          .selectAll("circle, path")
          .attr("stroke", "DarkSlateGrey")
          .attr("stroke-width", 2)
          .attr("opacity", 1);
      }
    });
  }

  tooltip.html(`<strong>${d.rank}°: ${d.title}<br>`)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px")
    .style("visibility", "visible");
}

function handleMouseOut(event, d) {
  if (!infoPanelVisible) {
      resetNetColors();
      link.attr("marker-end", "url(#arrow-end)")
          .attr("marker-start", d => d.bidirectional ? "url(#arrow-start)" : null);
  }

  tooltip.style("visibility", "hidden");
}

//handle mouseover link
function mouseEnterEdge(event, d) {
    const sourceNode = graph.nodes.find(n => n.id === (d.source.id || d.source));
    const targetNode = graph.nodes.find(n => n.id === (d.target.id || d.target));
  
    if (!sourceNode || !targetNode) return;

    if (!infoPanelVisible) {
      //highlight link 
      d3.select(this)
        .attr("stroke", "lime")
        .attr("stroke-width", 3)
        .attr("opacity", 1)
        .attr("marker-end", function(){
          return adjustMarkerEnd(3);
        })
        .attr("marker-start", function(){
          if(isBidirectional(d.source.id, d.target.id)){
            return adjustMarkerStart(3);
          }
            else {return null};
        });
      //highlight source and target nodes
      node.each(function (n) {
        if (n === d.source || n === d.target) {
          d3.select(this)
            .selectAll("circle, path")
            .attr("stroke", "lime")
            .attr("stroke-width", 3);
        }
      });
    }

    //show tooltip
  
    tooltip.style("visibility", "visible");
    tooltip.transition().duration(200).style("opacity", 0.9);

    if (isBidirectional(sourceNode.id, targetNode.id)) {
      tooltip.html(`<strong>${d.source.title} ↔ ${d.target.title}</strong><br>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");
    }else {
      tooltip.html(`<strong>${d.source.title} → ${d.target.title}</strong><br>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible");
    }
    
  }

//handle mouseout link
function mouseLeaveEdge(event, d) {
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
        .attr("stroke", "#606060")
        .attr("stroke-width", 1);
    }
  
    // Hide tooltip
    tooltip.style("visibility", "hidden");
  }

function centerNode(node) {
  width = +svg.node().getBoundingClientRect().width;
  height = +svg.node().getBoundingClientRect().height;
  const scale = d3.zoomTransform(svg.node()).k; 
  const x = -node.x * scale + width/2;
  const y = -node.y * scale + height/2;

  svg.transition()
    .duration(120)
    .call(zoom.transform, d3.zoomIdentity
        .translate(x, y)
        .scale(scale)
    );
}

function handleNodeClick(event, d) {
    
    infoPanelVisible = true;
    d3.select("body").classed("panel-open", true);
    d3.select("#info-panel").style("display", "block");
    tooltip.style("visibility", "hidden");

    //Reset visualization
    resetNetColors();
    networkGroup.selectAll("line").attr("opacity", 0.3);
    networkGroup.selectAll("circle, path").attr("opacity", 0.5);

    //highlight clicked node
    clickedNode = d3.select(this);
  
    clickedNode
      .selectAll("circle, path")
      .attr("stroke", "DarkSlateGrey")
      .attr("stroke-width", 2)
      .attr("opacity", 1);
  
    //Highlight outbound and bidirectional links
    link.each(function (l) {
      if (isBidirectional(l.source.id, l.target.id) && (l.source === d || l.target === d)) {
        d3.select(this)
          .attr("stroke", "DarkSlateGrey")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .attr("marker-end", function(){
            return adjustMarkerEnd(2);
          })
          .attr("marker-start", function(){
            return adjustMarkerStart(2);
          }); 
      } else if (l.source === d) {
        d3.select(this)
          .attr("stroke", "DarkSlateGrey")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .attr("marker-end", function(){
            return adjustMarkerEnd(2);
          })
          .attr("marker-start", null);
      }
    });

    //highlight target nodes
    node.each(function (n) {
      if (isAdjacent(d, n) || isBidirectional(d.id, n.id)) {
        d3.select(this)
          .selectAll("circle, path")
          .attr("stroke", "DarkSlateGrey")
          .attr("stroke-width", 2)
          .attr("opacity", 1);
      }
    });

    //Set fill to black for the clicked node
    if (d.type.length === 1) {
        // For single-colored nodes (circle)
        clickedNode.select("circle")
        .attr("fill", "black");
    } else if (d.type.length === 2) {
        // For bicolored nodes (paths)
        clickedNode.selectAll("path")
        .attr("fill", "black");
    }
  
    //Write game information
    var fans_liked = graph.links
      .filter(l => l.source.id === d.id || (l.target.id === d.id && isBidirectional(l.source.id, l.target.id)))
      .map(l => {
          let otherId = l.source.id === d.id ? l.target.id : l.source.id;
          return graph.nodes.find(n => n.id === otherId).title;
      });
    var colorScale = d3.scaleOrdinal().domain(types).range(d3.schemeTableau10);
    d3.select("#node-header").style("background", d3.color(colorScale(d.type[0])).copy({opacity: 0.5}))
    d3.select("#game-title").html(`
      ${d.title}
    `); 
    d3.select("#game-image").html(`      
      <img src="./game_thumbnails/${d.id}.jpg"
      alt="${d.title} image"
      onerror="this.style.display='none';">
      `);   
    d3.select("#game-rank").html(`<strong>Rank:</strong> ${d.rank}`);
    d3.select("#node-header").select(".info-row:nth-child(2) .info-value").text(d.year);
    d3.select("#node-header").select(".info-row:nth-child(3) .info-value")
      .text(d.categories.map(c => c.name).join(" | "));
    const mecContainer = d3.select("#node-header").select(".info-row:nth-child(4) .info-value");
    mecContainer.html(""); 
    mec = d.mechanics.map(m => m.name)
    const visibleCount = 3;
    if(mec.length >= 3){
      const shorMectList = mec.slice(0, visibleCount);
      const remainingMecList = mec.slice(visibleCount);
      mecContainer.html(`
        <details>
          <summary><strong>(Show all)</strong> ${shorMectList.join(" | ")}</summary>
          ${remainingMecList.join(" | ")}
        </details>
      `);
    }else {
      d3.select("#node-header").select(".info-row:nth-child(4) .info-value")
        .text(mec.join(" | "));
    }
    d3.select("#node-header").select(".info-row:nth-child(5) .info-value")
      .text(d.type.map(t => t).join(" | "));
    d3.select("#node-header").select(".info-row:nth-child(6) .info-value")
      .text(d.designer.map(des => des.name).join(" | "));
    const fansContainer = d3.select("#node-header").select(".info-row:nth-child(7) .info-value");
    fansContainer.html(""); 
    if(fans_liked.length >=3){
      const shortFanList = fans_liked.slice(0, visibleCount);
      const remainingFanList = fans_liked.slice(visibleCount);
      fansContainer.html(`
        <details>
          <summary><strong>(Show all)</strong> ${shortFanList.join(" | ")}</summary>
          ${remainingFanList.join(" | ")}
        </details>
      `);
    }else{
      d3.select("#node-header").select(".info-row:nth-child(7) .info-value")
        .text(fans_liked.join(" | "));
    }
  
    // Adjust SVG size and redraw hull if necessary
    svg.transition()
        .duration(100)
        .style("flex-basis", "70%")
        .on("end", function() {
            setTimeout(() => centerNode(d), 100);
          });
  
    if (activeHull !== null) {
      const hull = computeSingleHull(graph.nodes, activeHull);
      drawSingleHull(svg, hull, activeHull);
    }
  
    d3.select("#node-details").html("");
    d3.select("#info-panel").style("position", "relative");
  
    d3.select("#close-info-panel").on("click", () => {
      closeInfoPanel();
    });
  
    d3.select("#chart-content").html("");
    const neighbors = graph.links
      .filter(l => l.source.id === d.id || (l.target.id === d.id && isBidirectional(l.source.id, l.target.id)))
      .map(l => {
          let otherId = l.source.id === d.id ? l.target.id : l.source.id;
          return graph.nodes.find(n => n.id === otherId);
      });
    const data = [d, ...neighbors];
    data.sort((a, b) => d3.descending(a.minage, b.minage));
    d3.selectAll(".chart-btn").classed("active", false);
    
    //additional charts buttons
    d3.selectAll(".chart-btn").on("click", function() {
      const chartType = d3.select(this).attr("data-chart");
      d3.selectAll(".chart-btn").classed("active", false);
      d3.select(this).classed("active", true);
      const chartContent = d3.select("#chart-content")
      chartContent.html("");
      if(chartType === "rating"){
        data.sort((a, b) => d3.descending(a.rating, b.rating));
        const maxValue = 10;
        createAdditionalBarchart(data, chartContent, "rating", maxValue, "Rating", "network",(value) => value.toFixed(2), d.id);
      }else if (chartType === "minage") {
        data.sort((a, b) => d3.descending(a.minage, b.minage));
        const maxValue = getMaxMinAge(graph);
        createAdditionalBarchart(data, chartContent, "minage", maxValue, "Min Age", "network",(value) => value, d.id);
      } else if (chartType === "players") {
        data.sort((a, b) => d3.descending(a.minplayers, b.minplayers));
        createDumbbellChart(data, "minplayers", "maxplayers", chartContent, "Players", d.id);
      } else if (chartType === "playtime") {
        data.sort((a, b) => d3.descending(a.minplaytime, b.minplaytime));
        createDumbbellChart(data, "minplaytime", "maxplaytime", chartContent, "Playtime (min)", d.id);     
      } else if (chartType === "categories") {
        createCategoriesChart(data, chartContent, "network");
      }
    });

    //set labels text only for node clicked fans_liked cluster 
    nodeLabels
      .text(d => {
        const node = data.find(n => n.id == d.id);
        return node ? getShortTitle(node.title) : "";
      })
      .attr("dx", d => -radiusScale(d.rank)) 
      .attr("dy", "0.35em");

    nodeLabels
      .style("display", function(d){
        const node = data.find(n => n.id == d.id);
        if(node && labelsVisible){return "block";}
        else {return "none";}
    });

    d3.select("#toggle-labels").text(labelsVisible? "Hide Labels": "Show labels");

    function getMaxMinAge(dataset){
      return Math.max(...dataset.nodes.map(item => item.minage));
    }
}

svg.on("click", function(event) {
  if (event.target.tagName !== "circle" && event.target.tagName !== "path" && infoPanelVisible) {
    closeInfoPanel();
  }
});

function closeInfoPanel(){
  infoPanelVisible = false

  console.log("zoom", zoomLevel)

  nodeLabels
    .text(d => {
      if(zoomLevel <= 1){
        if(d.rank < 16)
          return getShortTitle(d.title)
        else return ""
      }else if(zoomLevel > 1 && zoomLevel <= 1.2){
        if(d.rank < 36)
          return getShortTitle(d.title)
        else return ""
      }else if(zoomLevel > 1.2 && zoomLevel <= 1.44){
        if(d.rank < 51)
          return getShortTitle(d.title)
        else return ""
      }else if(zoomLevel > 1.44 && zoomLevel <= 1.728){
        if(d.rank < 76)
          return getShortTitle(d.title)
        else return ""
      }else if(zoomLevel > 1.728)
          return getShortTitle(d.title)
    })

  d3.selectAll(".node-label").style("display", labelsVisible ? "block" : "none");
  d3.select("#toggle-labels").text(labelsVisible? "Hide Labels": "Show labels");
  d3.select("body").classed("panel-open", false);
  d3.select("#info-panel").style("display", "none");

  svg.style("flex-basis", "100%");

  updateSize()
  resetNetColors()
  // Redraw the hull if it was visible
  if (activeHull !== null) {
    const hull = computeSingleHull(graph.nodes, activeHull);
    drawSingleHull(svg, hull, activeHull);
  }

  window.history.replaceState({}, '', `${window.location.pathname}`);

  if(d3.zoomTransform(svg.node()).k == 1 && !infoPanelVisible)
    svg.transition().call(zoom.transform, d3.zoomIdentity);
}

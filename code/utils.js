function calcGamesByYear(data) {

  var years = [];

  data.nodes.forEach(game => {
    const year = game.year;

    let yearEntry = years.find(d => d.year == year)
    if (!yearEntry) {
      yearEntry = { 
        year: year,
        games: []
      };
        years.push(yearEntry);
    }
    yearEntry.games.push(game.id);
  });

  years.forEach(game => {
    game.count = game.games.length;
  })
  years = d3.sort(years, (a, b) => d3.ascending(a.count, b.count));
  return years;
}

function calcTypeByYears(data){

  var types = data.nodes.flatMap(d => d.type);
  types = [...new Set(types)];  
  var years = data.nodes.flatMap(d => d.year);
  years = [...new Set(years)];
  years = years.sort((a, b) => d3.ascending(a, b));

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

  return yearsType;
}

//helper function for text wrapping 
function wrapText(element, d, numChars){
  const self = d3.select(element);
  let title = String(d).trim();

  const abbreviations = {
      'edition': 'ed.',
      'second': '2nd',
      'third': '3rd',
      'fourth': '4th',
      'first': '1st',
      'fifth': '5th'
  };

  //Apply abbreviations
  for (let [word, abbrev] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      title = title.replace(regex, abbrev);
  }
  
  if (title.length > numChars) {
    let firstLine = title.substring(0, numChars);
    let secondLine = title.substring(numChars);
    
    const lastSpace = firstLine.lastIndexOf(' ');
    if (lastSpace > numChars - 10) {
      firstLine = title.substring(0, lastSpace);
      secondLine = title.substring(lastSpace + 1);
      if(secondLine.length > numChars){
        secondLine = title.substring(lastSpace + 1, lastSpace + 1 + numChars);
        secondLine = secondLine+"...";
      }
    }
    self.text('');
    self.append('tspan')
      .text(firstLine)
      .attr('x', -10)
      .attr('dy', '-0.3em');
    self.append('tspan')
      .text(secondLine)
      .attr('x', -10)
      .attr('dy', '1.1em');
  }
  else{
      self.text(title);
  }
}

//helper function for text wrapping in chord diagram
function wrapArcText(text, width) {
  text.each(function () {
      const textElement = d3.select(this);
      var words = textElement.text().split(/\s+/).reverse();
      var line = [];
      var lineNumber = 0;
      var lineHeight = 1.1;
      const x = textElement.attr("x") || 0; 
      const y = textElement.attr("y") || 0;
      var dy = parseFloat(textElement.attr("dy")) || 0;
      var tspan = textElement.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
      
      for (let word of words) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = textElement.append("tspan")
                  .attr("x", x)
                  .attr("y", y)
                  .attr("dy", ++lineNumber * lineHeight + dy + "em")
                  .text(word);
          }
      }
  });
}

function getShortTitle(title){
  title = String(title)
  if(title.includes(":"))
      return title.split(":")[0]+"..."
  else if(title.includes("("))
      return title.split("(")[0]+"..."
  else return title
}

function getShortCatName(catName){
  if(String(catName).length > 12)
    return String(catName).split("/").join("\n")
  else return catName
}



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

function calcTypeByYears2(data){

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
    };

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
        return yearsCateg;
      }
      
      
    function calcTypeByYears(data){
      
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
        typeByYear = yearsType;
      }

      function wrapText(element, d){
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
    
        //Apply le abbreviations
        for (let [word, abbrev] of Object.entries(abbreviations)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            title = title.replace(regex, abbrev);
        }
        
        if (title.length > 25) {
          let firstLine = title.substring(0, 25);
          let secondLine = title.substring(25);
          
          const lastSpace = firstLine.lastIndexOf(' ');
          if (lastSpace > 15) {
            firstLine = title.substring(0, lastSpace);
            secondLine = title.substring(lastSpace + 1);
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

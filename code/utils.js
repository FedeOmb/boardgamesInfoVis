/*function calcAges(data) {
    console.log(data);
    var ages = [];
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
    return ages;
  }
*/
  function calcGamesByYear(data) {
    console.log(data);
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
  
        console.log(yearsType)
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
        console.log(yearsCateg)
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
        console.log(yearsType)
        typeByYear = yearsType;
      }

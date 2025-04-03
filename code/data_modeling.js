

    var designers = []
    var mechanics = []
    
    d3.json("./data/boardgames_100.json", function (error, _graph) {
        if (error) throw error;
        var data
        var nodes = []
        var links = []

        data = data_cleaning(_graph)

        for(let i in data){
            let rat = data[i].rating.rating
            let rev = data[i].rating.num_of_reviews
            let cat = data[i].types.categories
            let mec = data[i].types.mechanics
            let des = data[i].credit.designer
            delete data[i].rating
            delete data[i].types
            delete data[i].credit
            data[i].rating = rat
            data[i].num_of_reviews = rev
            data[i].categories = cat
            data[i].mechanics = mec
            data[i].designer = des
        }
        //console.log(data)

        for(let i in data){
            for(let j in data[i].recommendations.fans_liked){
                let temp = {}
                temp.source = data[i].id
                temp.target = data[i].recommendations.fans_liked[j]
                links.push(temp)
            }
        }
        //console.log("LINKS")
        //console.log(JSON.stringify(links))

        for(let i in data){
            let temp = data[i]
            delete temp.recommendations
            nodes.push(temp)
        }
        //console.log("NODES")
        //console.log(JSON.stringify(nodes))

        //create_categories(data)
        //create_designers(data)
        //create_mechanics(data)
        
        dataset_conv_clean = {}
        dataset_conv_clean.nodes = nodes
        dataset_conv_clean.links = links

        //console.log("DATASET CONVERTED CLEANED")
        //console.log(dataset_conv_clean)
        //console.log(JSON.stringify(dataset_conv_clean))
      }
    );

    function data_cleaning(raw_data){
        let data = raw_data
        let games_id = []
        for (let i in data) {
            games_id.push(data[i].id)
        }
        for (let j in data) {
            data[j].recommendations.fans_liked = data[j].recommendations.fans_liked.filter((id) => {return games_id.includes(id)})
        }
        return data
    }  

    function create_categories(data){
        var categories = []
        var present = false
        for(let i in data){
            for(let j in data[i].categories){
                present = false
               for(let k in categories){
                    if(data[i].categories[j].id == categories[k].id)
                        present = true
                } 
                if(present == false){
                    let temp = {}
                    temp.id = data[i].categories[j].id
                    temp.name = data[i].categories[j].name
                    temp.games = []
                    categories.push(temp)
                }
            }
        }
        for(let i in data){
            for(let j in data[i].categories){
                for(let k in categories)
                    if(data[i].categories[j].id == categories[k].id)
                        categories[k].games.push(data[i].id)
            }
        }
        console.log("CATEGORIES")
        console.log(JSON.stringify(categories))
    }

    function create_mechanics(data){
        var present = false
        for(let i in data){
            for(let j in data[i].mechanics){
                present = false
               for(let k in mechanics){
                    if(data[i].mechanics[j].id == mechanics[k].id)
                        present = true
                } 
                if(present == false){
                    let temp = {}
                    temp.id = data[i].mechanics[j].id
                    temp.name = data[i].mechanics[j].name
                    temp.games = []
                    mechanics.push(temp)
                }
            }
        }
        for(let i in data){
            for(let j in data[i].mechanics){
                for(let k in mechanics)
                    if(data[i].mechanics[j].id == mechanics[k].id)
                        mechanics[k].games.push(data[i].id)
            }
        }
        console.log("MECHANICS VERS1")
        console.log(JSON.stringify(mechanics))    
    }

    function create_designers(data) {
        //designers versione 1
        var present = false
        for(let i in data){
            for(let j in data[i].designer){
                present = false
               for(let k in designers){
                    if(data[i].designer[j].id == designers[k].id)
                        present = true
                } 
                if(present == false){
                    let temp = {}
                    temp.id = data[i].designer[j].id
                    temp.name = data[i].designer[j].name
                    temp.games = []
                    designers.push(temp)
                }
            }
        }
        for(let i in data){
            for(let j in data[i].designer){
                for(let k in designers)
                    if(data[i].designer[j].id == designers[k].id)
                        designers[k].games.push(data[i].id)
            }
        }
        console.log("DESIGNERS VERS1")
        console.log(JSON.stringify(designers))

        //designers versione 1
        var designers2 = {}
        for(let i in designers){
            let id = designers[i].id
            let temp = {}
            temp.name = designers[i].name
            temp.games = designers[i].games
            designers2[id] = temp
        }
        console.log("DESIGNERS VERS2")
        console.log(JSON.stringify(designers2))

    }

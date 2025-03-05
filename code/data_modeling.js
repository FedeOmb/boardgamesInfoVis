    var data 
    var nodes = []
    var links = []
    var categories = []
    var designers = []
    var mechanics = []
    
    d3.json("./data/boardgames_100.json", function (error, _graph) {
        if (error) throw error;
        data = _graph

        for(i in data){
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

        for(i in data){
            for(j in data[i].recommendations.fans_liked){
                let temp = {}
                temp.source = data[i].id
                temp.target = data[i].recommendations.fans_liked[j]
                links.push(temp)
            }
        }
        //console.log(JSON.stringify(links))

        for(i in data){
            let temp = data[i]
            delete temp.recommendations
            nodes.push(temp)
        } 
        //console.log(JSON.stringify(nodes))

        //categories versione 1
        var present = false
        for(i in data){
            for(j in data[i].categories){
                present = false
               for(k in categories){
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
        for(i in data){
            for(j in data[i].categories){
                for(k in categories)
                    if(data[i].categories[j].id == categories[k].id)
                        categories[k].games.push(data[i].id)
            }
        }
        //console.log(JSON.stringify(categories))

        //categories versione 1
        var categories2 = {}
        for(i in categories){
            let id = categories[i].id
            let temp = {}
            temp.name = categories[i].name
            temp.games = categories[i].games
            categories2[id] = temp
        }
        //console.log(JSON.stringify(categories2))

        //mechanics versione 1
        var present = false
        for(i in data){
            for(j in data[i].mechanics){
                present = false
               for(k in mechanics){
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
        for(i in data){
            for(j in data[i].mechanics){
                for(k in mechanics)
                    if(data[i].mechanics[j].id == mechanics[k].id)
                        mechanics[k].games.push(data[i].id)
            }
        }
        //console.log(JSON.stringify(mechanics))

        //categories versione 1
        var mechanics2 = {}
        for(i in mechanics){
            let id = mechanics[i].id
            let temp = {}
            temp.name = mechanics[i].name
            temp.games = mechanics[i].games
            mechanics2[id] = temp
        }
        //console.log(JSON.stringify(mechanics2))

        //designers versione 1
        var present = false
        for(i in data){
            for(j in data[i].designer){
                present = false
               for(k in designers){
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
        for(i in data){
            for(j in data[i].designer){
                for(k in designers)
                    if(data[i].designer[j].id == designers[k].id)
                        designers[k].games.push(data[i].id)
            }
        }
        //console.log(JSON.stringify(designers))

        //categories versione 1
        var designers2 = {}
        for(i in designers){
            let id = designers[i].id
            let temp = {}
            temp.name = designers[i].name
            temp.games = designers[i].games
            designers2[id] = temp
        }
        //console.log(JSON.stringify(designers2))

      });

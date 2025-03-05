    
    d3.json("./data/boardgames_100.json", function (error, _graph) {
        if (error) throw error;
        console.log(_graph)
      });
    
    data = JSON.parse(JSON.stringify(dataset))
    console.log(data)
    data2 = data
    var nodes = []
    for(i in data){
        let temp = data[i]
        delete temp.recommendations
        nodes.push(temp)
    }
    console.log(nodes)

    var links = []
    console.log(data2)
    for(i in data2){
        let recom = data2[i].recommendations
        for(j in recom.fans_liked){
            console.log(j)
            let temp = {}
            temp.source = data2[i].id
            temp.target = data2[i].recommendations.fans_liked[j]
            links.push(temp)
        }
    }
    console.log(links)

    

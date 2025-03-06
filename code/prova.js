    
    d3.json("./data/dataset_converted_cleaned.json", function (error, _graph) {
        if (error) throw error;
        graph = _graph

        const cliques = findCliquesInGraph(graph);
        console.log("cliques: ");
        console.log(JSON.stringify(cliques))
    })

    function findCliquesInGraph(graph, minSize = 12) {
        // Step 1: Build adjacency list
        const adjacencyList = buildAdjacencyList(graph);
      
        // Step 2: Find cliques using Bron-Kerbosch
        const cliques = bronKerbosch(adjacencyList, minSize);
      
        return cliques;
    }
    
    function bronKerbosch(adjacencyList, minSize = 12) {
        const cliques = [];
      
        function findCliques(R, P, X) {
          if (P.size === 0 && X.size === 0) {
            if (R.size >= minSize) {
              cliques.push([...R]);
            }
            return;
          }
      
          for (const node of [...P]) {
            const neighbors = adjacencyList.get(node);
            findCliques(
              new Set([...R, node]),
              new Set([...P].filter(n => neighbors.has(n))),
              new Set([...X].filter(n => neighbors.has(n)))
            );
            P.delete(node);
            X.add(node);
          }
        }
      
        findCliques(new Set(), new Set(adjacencyList.keys()), new Set());
        return cliques;
    }

    function buildAdjacencyList(graph) {
        const adjacencyList = new Map();
      
        // Initialize adjacency list for each node
        graph.nodes.forEach(node => {
          adjacencyList.set(node.id, new Set());
        });
      
        // Populate adjacency list based on links
        graph.links.forEach(link => {
          adjacencyList.get(link.source).add(link.target);
          adjacencyList.get(link.target).add(link.source);
        });
      
        return adjacencyList;
    }

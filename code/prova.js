    
    d3.json("./data/dataset_converted_cleaned.json", function (error, _graph) {
        if (error) throw error;
        graph = _graph

        //find cliques
        const cliques = findCliquesInGraph(graph);
        //console.log("cliques:", JSON.stringify(cliques));

        groupNodes(graph)
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

    function groupNodes(dataset){

      const adjacencyMap = new Map();

// Creiamo una mappa delle connessioni
dataset.links.forEach(({ source, target }) => {
    if (!adjacencyMap.has(source)) adjacencyMap.set(source, new Set());
    if (!adjacencyMap.has(target)) adjacencyMap.set(target, new Set());

    adjacencyMap.get(source).add(target);
    adjacencyMap.get(target).add(source);
});

// Funzione per trovare cluster con un criterio più ampio
const visited = new Set();
const clusters = [];
const nodeClusterMap = new Map();

function findCluster(startNode) {
    const stack = [startNode];
    const cluster = new Set();
    const categoryMap = new Map();

    while (stack.length > 0) {
        const node = stack.pop();
        if (!visited.has(node)) {
            visited.add(node);
            cluster.add(node);
            nodeClusterMap.set(node, clusters.length);

            const nodeData = dataset.nodes.find(n => n.id === node);

            // Aggiungiamo le categorie alla mappa
            nodeData.categories.forEach(category => {
                categoryMap.set(category.name, (categoryMap.get(category.name) || 0) + 1);
            });

            // Espansione: consideriamo connessioni dirette e giochi con almeno 3 vicini in comune
            (adjacencyMap.get(node) || []).forEach(neighbor => {
                const neighborConnections = adjacencyMap.get(neighbor) || new Set();
                const commonLinks = [...neighborConnections].filter(n => cluster.has(n)).length;
                const sharedCategories = nodeData.categories.filter(cat => 
                  dataset.nodes.find(n => n.id === neighbor)?.categories.some(c => c.name === cat.name)
                ).length;
                
                const sharedMechanics = nodeData.mechanics.filter(mech => 
                    dataset.nodes.find(n => n.id === neighbor)?.mechanics.some(m => m.name === mech.name)
                ).length;
                
                if (!visited.has(neighbor) && (neighborConnections.has(node) || commonLinks >= 2 || sharedCategories >= 2 || sharedMechanics >= 2)) {
                    stack.push(neighbor);
                }
            });
        }
    }

   

    // Se il cluster è grande, suddividiamolo per categorie
    if (cluster.size > 15) {
        const topCategories = [...categoryMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category]) => category);

        const subClusters = new Map();

        cluster.forEach(nodeId => {
            const nodeData = dataset.nodes.find(n => n.id === nodeId);
            const bestCategory = nodeData.categories.find(cat => topCategories.includes(cat.name));

            if (bestCategory) {
                if (!subClusters.has(bestCategory.name)) subClusters.set(bestCategory.name, new Set());
                subClusters.get(bestCategory.name).add(nodeId);
            }
        });

        subClusters.forEach((nodes) => clusters.push(nodes));
    } else {
        clusters.push(cluster);
    }
}

// Eseguiamo il clustering su tutti i nodi
dataset.nodes.forEach(node => {
    if (!visited.has(node.id)) {
        findCluster(node.id);
    }
});

// Riassegniamo i nodi isolati al cluster più vicino
dataset.nodes.forEach(node => {
    if (!nodeClusterMap.has(node.id)) {
        let bestCluster = -1;
        let maxSharedLinks = 0;

        (adjacencyMap.get(node.id) || []).forEach(neighbor => {
            if (nodeClusterMap.has(neighbor)) {
                const clusterId = nodeClusterMap.get(neighbor);
                const sharedLinks = adjacencyMap.get(node.id).size;

                if (sharedLinks > maxSharedLinks) {
                    bestCluster = clusterId;
                    maxSharedLinks = sharedLinks;
                }
            }
        });

        if (bestCluster !== -1) {
            nodeClusterMap.set(node.id, bestCluster);
            clusters[bestCluster].add(node.id);
        } else {
            clusters.push(new Set([node.id]));
            nodeClusterMap.set(node.id, clusters.length - 1);
        }
    }
});

// Log dei risultati
console.log(`Trovati ${clusters.length} cluster.`);
clusters.forEach((cluster, i) => console.log(`Cluster ${i}: ${[...cluster]}`));
    }

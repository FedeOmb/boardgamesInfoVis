    
    d3.json("./data/dataset_converted_cleaned_40.json", function (error, _graph) {
      if (error) throw error;
      graph = _graph

      //find cliques
      const cliques = findCliquesInGraph(graph);
      console.log("cliques:", JSON.stringify(cliques));

      //groupNodes(graph)
      groupNodes2(graph)
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

function groupNodes2(data){

  function jaccardSimilarity(setA, setB) {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

function addEdgeWeights(nodes, links, attribute) {
  const weightedLinks = links.map(link => {
      const sourceNode = nodes.find(node => node.id === link.source);
      const targetNode = nodes.find(node => node.id === link.target);

      const sourceAttributes = new Set(sourceNode[attribute].map(a => a.id));
      const targetAttributes = new Set(targetNode[attribute].map(a => a.id));

      const weight = jaccardSimilarity(sourceAttributes, targetAttributes);
      return { ...link, weight };
  });

  return weightedLinks;
}

function weightedLabelPropagation(nodes, weightedLinks) {
  const labels = new Map();
  nodes.forEach((node, index) => labels.set(node.id, index));

  const adjacencyList = new Map();
  nodes.forEach(node => adjacencyList.set(node.id, []));
  weightedLinks.forEach(link => {
      adjacencyList.get(link.source).push({ neighbor: link.target, weight: link.weight });
      adjacencyList.get(link.target).push({ neighbor: link.source, weight: link.weight });
  });

  let changed;
  do {
      changed = false;
      nodes.forEach(node => {
          const labelWeights = new Map();
          adjacencyList.get(node.id).forEach(({ neighbor, weight }) => {
              const neighborLabel = labels.get(neighbor);
              labelWeights.set(neighborLabel, (labelWeights.get(neighborLabel) || 0) + weight);
          });

          let maxLabel = null;
          let maxWeight = -1;
          labelWeights.forEach((weight, label) => {
              if (weight > maxWeight) {
                  maxWeight = weight;
                  maxLabel = label;
              }
          });

          if (labels.get(node.id) !== maxLabel) {
              labels.set(node.id, maxLabel);
              changed = true;
          }
      });
  } while (changed);

  const communities = new Map();
  labels.forEach((label, nodeId) => {
      if (!communities.has(label)) {
          communities.set(label, []);
      }
      communities.get(label).push(nodeId);
  });

  return Array.from(communities.values());
}

function splitClusterWithWeightedLPA(cluster, nodes, links, attribute) {
  const subgraphNodes = nodes.filter(node => cluster.includes(node.id));
  const subgraphLinks = links.filter(link =>
      cluster.includes(link.source) && cluster.includes(link.target)
  );

  const weightedLinks = addEdgeWeights(subgraphNodes, subgraphLinks, attribute);
  return weightedLabelPropagation(subgraphNodes, weightedLinks);
}

function mergeSmallSubclusters(subclusters, nodes, attribute, threshold = 4) {
  const mergedSubclusters = subclusters.filter(subcluster => subcluster.length >= threshold);

  subclusters.forEach(subcluster => {
      if (subcluster.length < threshold) {
          let bestSubcluster = null;
          let bestSimilarity = -1;

          mergedSubclusters.forEach(targetSubcluster => {
              const targetAttributes = new Set(
                  targetSubcluster.flatMap(nodeId => {
                      const node = nodes.find(n => n.id === nodeId);
                      return node[attribute].map(a => a.id);
                  })
              );

              const subclusterAttributes = new Set(
                  subcluster.flatMap(nodeId => {
                      const node = nodes.find(n => n.id === nodeId);
                      return node[attribute].map(a => a.id);
                  })
              );

              const similarity = jaccardSimilarity(targetAttributes, subclusterAttributes);
              if (similarity > bestSimilarity) {
                  bestSimilarity = similarity;
                  bestSubcluster = targetSubcluster;
              }
          });

          if (bestSubcluster) {
              bestSubcluster.push(...subcluster);
          } else {
              // If no suitable subcluster is found, create a new one
              mergedSubclusters.push(subcluster);
          }
      }
  });

  return mergedSubclusters;
}

function updateClusters(clusters, largeClusters, subclusters) {
  const updatedClusters = clusters.filter(cluster => cluster.length <= LARGE_CLUSTER_THRESHOLD);
  return updatedClusters.concat(subclusters);
}

const weightedLinks = addEdgeWeights(data.nodes, data.links, 'categories'); // or 'mechanics'
console.log("Weighted Links:", weightedLinks);

const clusters = weightedLabelPropagation(data.nodes, weightedLinks);

const LARGE_CLUSTER_THRESHOLD = 10;
const largeClusters = clusters.filter(cluster => cluster.length > LARGE_CLUSTER_THRESHOLD);
console.log("Large Clusters:", largeClusters);

// Step 2: Split large clusters using Weighted LPA or K-Means
const subclusters = largeClusters.flatMap(cluster =>
    splitClusterWithWeightedLPA(cluster, data.nodes, data.links, 'categories') 
);
console.log("Subclusters:", subclusters);

const subgraphNodes = data.nodes.filter(node => subclusters.includes(node.id));
const subgraphLinks = data.links.filter(link =>
    clusters.includes(link.source) && subclusters.includes(link.target)
);
console.log("Subgraph Nodes:", subgraphNodes);
console.log("Subgraph Links:", subgraphLinks);
const subgraphWeightedLinks = addEdgeWeights(subgraphNodes, subgraphLinks, 'categories');
const subgraphClusters = weightedLabelPropagation(subgraphNodes, subgraphWeightedLinks);
console.log("Subgraph Clusters:", subgraphClusters);

// Step 3: Merge small subclusters
const mergedSubclusters = mergeSmallSubclusters(subclusters, data.nodes, 'categories');
console.log("Merged Subclusters:", mergedSubclusters);

// Step 4: Update the clusters
const updatedClusters = updateClusters(clusters, largeClusters, mergedSubclusters);
console.log("Updated Clusters:", JSON.stringify(updatedClusters));
}

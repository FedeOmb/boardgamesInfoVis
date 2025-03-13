const Graph = require('graphology');
const { connectedComponents } = require('graphology-components');
const communitiesLouvain = require('graphology-communities-louvain');
const { jaccardSimilarity } = require('compute-jaccard'); // For Jaccard similarity
const { hcluster } = require('ml-hclust'); // For hierarchical clustering
var fs = require('fs');
var file1 = '../data/dataset_cleaned_bidirectional_100.json'
var dataset 

fs.readFile(file1, 'utf-8', (err, data) => {
    if (err) console.log(err);
    dataset = JSON.parse(data)
    // Create a new graph
    const graph = new Graph();

    // Add nodes to the graph
    dataset.nodes.forEach(node => {
    graph.addNode(node.id, { ...node });
    });

    // Add edges to the graph
    dataset.links.forEach(link => {
    graph.addEdge(link.source, link.target);
    });

    //louvainClustering(graph)

    // Step 1: Define a similarity metric
function getNodeAttributes(node) {
    // Combine categories and mechanics into a single set of attributes
    const categories = node.categories.map(c => c.name);
    const mechanics = node.mechanics.map(m => m.name);
    return [...new Set([...categories, ...mechanics])]; // Remove duplicates
  }
  
  // Step 2: Create a distance matrix
  function createDistanceMatrix(nodes) {
    const matrix = [];
    for (let i = 0; i < nodes.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < nodes.length; j++) {
        const setA = new Set(getNodeAttributes(nodes[i]));
        const setB = new Set(getNodeAttributes(nodes[j]));
        const similarity = jaccardSimilarity(setA, setB); // Jaccard similarity
        const distance = 1 - similarity; // Convert similarity to distance
        matrix[i][j] = distance;
      }
    }
    return matrix;
  }
  
  // Step 3: Apply hierarchical clustering
  function clusterNodes(nodes, distanceMatrix, numClusters) {
    const clusters = hcluster(distanceMatrix, {
      method: 'average', // Linkage method
      size: numClusters // Number of clusters
    });
    return clusters;
  }
  
  // Step 4: Assign colors to clusters
  function assignColorsToClusters(nodes, clusters) {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5']; // Add more colors as needed
    nodes.forEach((node, index) => {
      node.color = colors[clusters[index] % colors.length];
    });
  }
  
  // Main function
  function main() {
    // Create a new graph
    const graph = new Graph();
  
    // Add nodes to the graph
    dataset.nodes.forEach(node => {
      graph.addNode(node.id, { ...node });
    });
  
    // Add edges to the graph
    dataset.links.forEach(link => {
      graph.addEdge(link.source, link.target);
    });
  
    // Create distance matrix
    const distanceMatrix = createDistanceMatrix(data.nodes);
  
    // Perform hierarchical clustering
    const numClusters = 3; // Number of clusters (you can adjust this)
    const clusters = clusterNodes(data.nodes, distanceMatrix, numClusters);

    console.log(clusters)
  
    // Assign colors to nodes based on clusters
    assignColorsToClusters(data.nodes, clusters);
  
    // Update graph with cluster colors
    dataset.nodes.forEach(node => {
      graph.setNodeAttribute(node.id, 'color', node.color);
    });
  
    // Export the graph for visualization
    const graphJSON = graph.export();
    //console.log(JSON.stringify(graphJSON, null, 2));
  }
    
});

function louvainClustering(graph){
    // Detect communities using Louvain algorithm
    const communities = communitiesLouvain(graph);
    var details = louvain.detailed(graph);
    console.log(details)
    console.log("Communities", communities)

    // Get connected components (optional, if you want to group by connectivity)
    const components = connectedComponents(graph);

    //console.log("Components", components)

    // Now you can use the graph with D3.js for visualization
    // For example, you can export the graph to JSON and use it in your D3.js code
    const graphJSON = graph.export();
    //console.log(JSON.stringify(graphJSON, null, 2));
}
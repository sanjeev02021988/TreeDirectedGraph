var width = 1200,
    height = 600,
    rootNodeId = "DRD1";
var graphUtilityObj = new generateGraphData(height, width, 0, 0, 6);
var forceLayoutObj = new ForceLayout();
//Change graph to tree.json and rootNodeId to graphJson for complete tree layout.
d3.json("./json/graph.json", function (error, graphJson) {
	/*for(var i = 7; i < 10; i++){
        var id = "Cube"+i;
        graphJson[rootNodeId].outgoing.push(id);
        graphJson[id] = {
            "name": id,
            "depth": 3
        }
    }*/
    //Convert tree json into graph obj which has nodes and edges.
    var graph = graphUtilityObj.updateNodesMap(graphJson, rootNodeId);
    forceLayoutObj.init(graph, width, height);
});




var width = 1300,
    height = 1500,
    visibleHeight = 643,
    rootNodeId = "DRD1";
var graphUtilityObj = new generateGraphData(visibleHeight, width, 0, 0, 6);
var layoutObj = new Layout();
//Change graph to tree.json and rootNodeId to graphJson for complete tree layout.
d3.json("./json/graph.json", function (error, graphJson) {
    for (var i = 7; i < 48; i++) {
        var id = "Cube" + i;
        graphJson[rootNodeId].outgoing.push(id);
        graphJson[id] = {
            "name": id,
            "depth": 3
        }
    }
    //Convert tree json into graph obj which has nodes and edges.
    var graph = graphUtilityObj.updateNodesMap(graphJson, rootNodeId);
    layoutObj.init(graph, width, height);
});

$("#ConfigButton").on("click", function () {
    $("#ConfigDialog").show();
    $(".overlay-win").show();
});

$("#cancelButton").on("click", function () {
    $("#ConfigDialog").hide();
    $(".overlay-win").hide();
});

$("#applyButton").on("click", function () {
    var edgeType = $('input[name="edgeType"]:checked').val();
    var labelDirection = $('input[name="nodeLabel"]:checked').val();
    var nodeRadius = $('#nodeRadius').val();
    var edgeColor = $('#edgeColor').val();
    var minSpace = $('#minSpace').val();
    var colCount = $('#colCount').val();
    graphUtilityObj.updateNodesAndLinksArr(minSpace, colCount);
    layoutObj.reDraw(Number(nodeRadius), edgeType, edgeColor, labelDirection);
    $("#ConfigDialog").hide();
    $(".overlay-win").hide();
});

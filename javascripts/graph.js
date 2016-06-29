var svgWidth = 1300,
    svgHeight = 6300,
    visibleWidth = svgWidth,
    visibleHeight = 630,
    rootNodeId = "DRD1",
    nodeRadius = 10;
var isScrollingEnabled = true;
var graphUtilityObj = new generateGraphData(visibleHeight - nodeRadius * 2, visibleWidth, 0, 0, 6);
var layoutObj = new Layout();
updateHeightOfContainerDiv(visibleHeight, visibleWidth);
//Change graph to tree.json and rootNodeId to graphJson for complete tree layout.
d3.json("./json/graph.json", function (error, graphJson) {
    for (var i = 7; i < 40; i++) {
        var id = "Cube" + i;
        graphJson[rootNodeId].outgoing.push(id);
        graphJson[id] = {
            "name": id,
            "depth": 3
        }
    }
    //Convert tree json into graph obj which has nodes and edges.
    var graph = graphUtilityObj.updateNodesMap(graphJson, rootNodeId);
    layoutObj.init("svgContainer", graph, svgWidth, svgHeight, nodeRadius);
    var heightUsedOfSvg = graphUtilityObj.getHeightUsedOfSvg() + nodeRadius * 2;
    updateHeightOfContainerDiv(heightUsedOfSvg, visibleWidth);
});

function updateHeightOfContainerDiv (height, width){
    if(isScrollingEnabled){
        $("#svgContainer").css({
            height:height+"px",
            width:width+"px"
        });
    }else{
        $("#svgContainer").css({
            height:visibleHeight+"px",
            width:visibleWidth+"px"
        });
    }
}

$("#ConfigButton").on("click", function () {
    $("#ConfigDialog").show();
    $(".overlay-win").show();
});

function hideConfigDialog() {
    $("#ConfigDialog").hide();
    $(".overlay-win").hide();
}

$("#cancelButton").on("click", function () {
    hideConfigDialog();
});

$("#applyButton").on("click", function () {
    var edgeType = $('input[name="edgeType"]:checked').val();
    var labelDirection = $('input[name="nodeLabel"]:checked').val();
    isScrollingEnabled = $('input[name="enableScroll"]').is(':checked');
    nodeRadius = $('#nodeRadius').val();
    var edgeColor = $('#edgeColor').val();
    var minSpace = $('#minSpace').val();
    var colCount = $('#colCount').val();
    graphUtilityObj.updateNodesAndLinksArr(minSpace, colCount);
    layoutObj.reDraw(Number(nodeRadius), edgeType, edgeColor, labelDirection);
    hideConfigDialog();
    var heightUsedOfSvg = graphUtilityObj.getHeightUsedOfSvg() + nodeRadius * 2;
    updateHeightOfContainerDiv(heightUsedOfSvg, visibleWidth);
});

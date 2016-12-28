var svgWidth = 1366,
    svgHeight = 6300,
    visibleWidth = svgWidth,
    visibleHeight = 643,
    rootNodeId = "DRD1",
    nodeRadius = 10,
    edgeType = "CURVE",
    edgeColor = "#999999",
    labelDirection = "RIGHT";

var graphUtilityObj = new GraphUtility(visibleHeight, visibleWidth, 0, 0, 6);
var layoutObj = new Layout();

//Change graph to tree.json and rootNodeId to graphJson for complete tree layout.
d3.json("./json/" + rootNodeId + ".json", function (error, graphJson) {
    if(!error){
        for (var i = 6; i < 20; i++) {
            var id = "Cube" + i;
            graphJson[rootNodeId].outgoing.push(id);
            graphJson[id] = {
                "name": id,
                "depth": 3
            };
        }
        //Convert tree json into graph obj which has nodes and edges.
        var graph = graphUtilityObj.getGraphObj(graphJson, rootNodeId);
        layoutObj.init("mainSvgContainer", graph, svgWidth, svgHeight, nodeRadius, edgeType, edgeColor, labelDirection);
    }
});

(function attachEventsToButtons(){
    $("#mainSvgContainer").width(visibleWidth);
    $("#mainSvgContainer").height(visibleHeight);

    $("#ConfigButton").on("click", function () {
        $("#ConfigDialog").show();
        $(".overlay-win").show();
    });

    $("#cancelButton").on("click", function () {
        hideConfigDialog();
    });

    $(".zoom-in").on("click",function(){
        layoutObj.zoomInOut(0.1);
    });

    $(".zoom-out").on("click",function(){
        layoutObj.zoomInOut(-0.1);
    });

    $(".enable_selection").on("click",function(event){
        layoutObj.enableSelection($("input[type='checkbox']",this).is(":checked"));
    });

    $("#applyButton").on("click", function () {
        var edgeType = $('input[name="edgeType"]:checked').val();
        var labelDirection = $('input[name="nodeLabel"]:checked').val();
        nodeRadius = $('#nodeRadius').val();
        var edgeColor = $('#edgeColor').val();
        var minSpace = $('#minSpace').val();
        graphUtilityObj.updateNodesAndLinksArr(minSpace);
        layoutObj.reDraw(Number(nodeRadius), edgeType, edgeColor, labelDirection);
        hideConfigDialog();
    });

    function hideConfigDialog() {
        $("#ConfigDialog").hide();
        $(".overlay-win").hide();
    }
})();
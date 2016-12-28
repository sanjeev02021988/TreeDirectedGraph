function Layout() {
    var thisRef = this;

    var containerId = "";
    var graph = null;
    var width = 0;
    var height = 0;
    var nodeRadius = 10;
    var edgeType = "STRAIGHT";
    var edgeColor = "#999999";
    var labelDirection = "RIGHT";

    var links = null;
    var nodes = null;
    var selectedNodes = [];
    var isNodeHighlighted = false;

    var svg = null;
    var svgParent = null;
    var mainSvg = null;

    //Providing support for dynamic generation of colors.
    var color = d3.scale.category20();
    var tip = null;
    var zoom = null;
    var zoomSmallMap = null;

    thisRef.init = function (tContainerId, tGraph, tWidth, tHeight, tNodeRadius, tEdgeType, tEdgeColor, tLabelDirection) {
        containerId = tContainerId;
        graph = tGraph;
        width = tWidth;
        height = tHeight;
        nodeRadius = tNodeRadius;
        edgeType = tEdgeType;
        edgeColor = tEdgeColor;
        labelDirection = tLabelDirection;
        startLayoutCreation();
    };

    thisRef.reDraw = function (tRadius, tEdgeType, tEdgeColor, tLabelDirection) {
        nodeRadius = tRadius;
        edgeType = tEdgeType;
        edgeColor = tEdgeColor;
        labelDirection = tLabelDirection;
        svg.remove();
        nodes = null;
        links = null;
        startLayoutCreation();
    };

    thisRef.update = function () {
        updateLayout();
        nodes.exit().transition().remove();
        links.exit().transition().remove();
        var initialCoordinates = graphUtilityObj.getRenderingCoordinates(mainSvg);
        mainSvg.attr("transform", "translate(" + initialCoordinates + ")");
        addRectToSmallMap();
    };

    var startLayoutCreation = function () {
        initializeLayout();
        updateLayout();
    };

    var updateLayout = function () {
        drawEdge();
        drawNode();
        updateNeighborInfo();
        enableSelection();
        d3.select(".miniSVG")
            .select("g")
            .attr("transform", "scale(" + graphUtilityObj.scalingOfSmallMap() + ")");
    };

    var initializeLayout = function () {
        enableZooming();
        appendSVG();
        enableArrowHeads();
        enableToolTip();
    };

    var zoomIncrementFactor = 0;
    this.zoomInOut  = function(incrementFactor) {
        zoomIncrementFactor += incrementFactor;
        svgParent.selectAll("rect.selection").remove();
        var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
        var newScalingArr = mainSvgTransformObj.scale[0] + incrementFactor;
        mainSvg.attr("transform", "translate(" + mainSvgTransformObj.translate + ")scale(" + newScalingArr + ")");
        addRectToSmallMap(mainSvgTransformObj.translate, newScalingArr);
    };

    var selectionEnabled = false;
    var translateVector = [0,0];
    this.enableSelection = function(enableSelection){
        selectionEnabled = enableSelection;
        if(selectionEnabled){
            zoom.on("zoom.mousemove",null);
        }
    };

    var enableZooming = function () {
        zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", zoomed);

        function zoomed(events) {
            if(selectionEnabled){
                var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
                translateVector = [mainSvgTransformObj.translate[0] - d3.event.translate[0],mainSvgTransformObj.translate[1] - d3.event.translate[1]];

                /*var coordinates = [0, 0];
                 coordinates = d3.mouse(this);
                 var x = coordinates[0];
                 var y = coordinates[1];
                var scaling = d3.event.scale + zoomIncrementFactor;
                mainSvg.attr("transform", "translate(" + mainSvgTransformObj.translate + ")scale(" + scaling + ")");*/
                return;
            }
            var newTranslatePos = [d3.event.translate[0] + translateVector[0], d3.event.translate[1] + translateVector[1]];
            svgParent.selectAll("rect.selection").remove();
            var scaling = d3.event.scale + zoomIncrementFactor;
            mainSvg.attr("transform", "translate(" + newTranslatePos + ")scale(" + scaling + ")");
            addRectToSmallMap(newTranslatePos, d3.event.scale + zoomIncrementFactor);
        }

        $("#ResetButton").on("click", reset);
        function reset() {
            mainSvg.attr("transform", "translate(0,0)scale(1)");
            zoom.translate([0, 0]).scale(1);
            addRectToSmallMap([0,0],1);
        }
        enableZoomingSmallMap();
    };

    var enableZoomingSmallMap = function () {
        zoomSmallMap = d3.behavior.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", zoomed);
        function zoomed() {
            d3.select(".miniSVG").select("rect")
                .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            var scalingFactor = d3.event.scale/graphUtilityObj.scalingOfSmallMap();
            var x = d3.event.translate[0] * scalingFactor,
                y = d3.event.translate[1] * scalingFactor;
            mainSvg.attr("transform", "translate(" + [x,y] + ")scale(" + scalingFactor + ")");
        }
    };

    var appendSVG = function () {
        //Add svg to the body.
        svgParent = d3.selectAll(".graphSVG").call(zoom);
        svg = svgParent
            .attr('width', width)
            .attr('height', height)
            .append("g");

        mainSvg = d3.select(".mainSVG")
            .select("g");
        addRectToSmallMap([0,0]);
    };

    var addRectToSmallMap = function(initialCoordinates, scalling){
        if(!initialCoordinates){
            initialCoordinates = graphUtilityObj.getRenderingCoordinates(mainSvg);
        }
        if(!scalling){
            scalling = 1;
        }
        var scalingFactor = graphUtilityObj.scalingOfSmallMap()/scalling;
        var rect = d3.select(".miniSVG").select("rect");
        if(!rect[0][0]){
            rect = d3.select(".miniSVG").append("rect");
        }
        rect.attr({
                rx: 2,
                ry: 2,
                class: "smallMapSelection",
                x: -1 * initialCoordinates[0] * scalingFactor + 1,
                y: -1 * initialCoordinates[1] * scalingFactor + 1,
                width: visibleWidth * scalingFactor - 4,
                height: visibleHeight * scalingFactor - 2
            });
        //rect.call(zoomSmallMap);
    };

    var enableArrowHeads = function () {
        //Providing support for creating arrow heads to the path.
        svg.append("defs").selectAll("marker")
            .data(["end"])               // Different link/path types can be defined here
            .enter().append("marker")    // This section adds in the arrows
            .attr("id", function (d) {
                console.log(d);
                return d;
            })
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", function () {
                return 10 + 11 * nodeRadius / 10;
            })
            .attr("refY", function () {
                return (edgeType === "CURVE") ? -0.5 : 0;
            })
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .style("stroke", edgeColor).style("fill", edgeColor);
    };

    var enableToolTip = function () {
        //Set up tooltip
        tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function (d) {
                return  d.name + "";
            });
        svg.call(tip);
    };

    var drawEdge = function () {
        if (!links) {
            links = svg.append("g").selectAll("path");
        }
        links = links.data(graph.links, function (d) {
            return d.source.id + "_" + d.target.id;
        });
        //Describing properties of the edges.
        links.enter().append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)");
        renderEdge();
    };

    var renderEdge = function (skipAnimation) {
        var tempLinkObj = links;
        //Appending edges to the layout.
        if (!skipAnimation) {
            tempLinkObj = links.transition().ease("linear")
                .duration(600);
        }
        tempLinkObj.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y;
            var point = 0;
            if(dx === 0){
                point = d.source.x - 90;
            }else{
                point = d.source.x + 90;
            }
            return "M" +
                d.source.x + "," +
                d.source.y + "C"+point+"," +
                d.source.y + " "+point+"," +
                d.target.y + " " +
                d.target.x + "," +
                d.target.y;
        }).style("stroke",function(d){
            var dx = d.target.x - d.source.x;
            if(dx === 0){
                return edgeColor;//"red"
            }
            return edgeColor;
        });
    };

    var drawNode = function () {
        if (!nodes) {
            nodes = svg.selectAll('.node');
        }
        nodes = nodes.data(graph.nodes, function (d) {
            return d.id;
        });
        //Describing properties of the nodes.
        var newNodes = nodes.enter()
            .append("g")
            .attr("class", "node");
        //Adding circle to the g tag of the node.
        newNodes.append("circle").attr({
            'r': nodeRadius + 4,
            class: 'outer'});
        newNodes.append("circle").attr('r', nodeRadius)
            .style("fill", function (d) {
                return color(d.level);
            });
        renderNode();
        attachLabelToNode(newNodes);
        attachEventsToNode();
    };

    var renderNode = function () {
        nodes.transition().ease("linear")
            .duration(600).attr("transform", function (d) {
                var x = d.x;
                var y = d.y;
                return "translate(" + x + "," + y + ")";
            });
    };

    var attachLabelToNode = function (newNodes) {
        var dx = nodeRadius + 5;
        var dy = ".35em";
        if (labelDirection === "CENTER" || labelDirection === "TOP" || labelDirection === "BOTTOM") {
            dx = -nodeRadius / 2 - 5;
            if (labelDirection === "TOP") {
                dx = -nodeRadius;
                dy = -nodeRadius / 2 - 10;
            } else if (labelDirection === "BOTTOM") {
                dx = -nodeRadius;
                dy = nodeRadius + 10;
            }
        }
        if (!newNodes) {
            newNodes = nodes;
        }
        //Adding label to the node.
        newNodes.append("text")
            .attr("dx", dx)
            .attr("dy", dy)
            .text(function (d) {
                return d.name;
            });
    };

    var attachEventsToNode = function () {
        //Adding events to the node.
        nodes.on('contextmenu', function (d) {
            d3.event.preventDefault();
            showContextMenu(d);
        })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .on('click', highlightConnectedNodes);
    };

    var linkedByIndex = {};
    var nodeLinkedInfo = {};
    //This function looks up whether a pair are neighbours
    var neighboring = function (a, b) {
        if (a.id === b.id) {
            return 1;
        }
        return linkedByIndex[a.id + "," + b.id];
    };

    var updateNeighborInfo = function () {
        function initNodeObjLinkedInfo(nodeId) {
            if (!nodeLinkedInfo[nodeId]) {
                nodeLinkedInfo[nodeId] = {
                    incoming: [],
                    outgoing: []
                };
            }
        }

        //Create an array logging what is connected to what
        linkedByIndex = {};
        nodeLinkedInfo = {};
        graph.links.forEach(function (d) {
            linkedByIndex[d.source.id + "," + d.target.id] = 1;
            initNodeObjLinkedInfo(d.source.id);
            initNodeObjLinkedInfo(d.target.id);
            nodeLinkedInfo[d.source.id].outgoing[d.target.id] = 1;
            nodeLinkedInfo[d.target.id].incoming[d.source.id] = 1;
        });
    };

    var highlightConnectedNodes = function (nodeObj) {
        if (!isNodeHighlighted) {
            //Reduce the opacity of all but the neighbouring nodes
            nodes.style("opacity", function (d) {
                return neighboring(nodeObj, d) | neighboring(d, nodeObj) ? 1 : 0.2;
            });
            links.style("opacity", function (d) {
                return nodeObj.id === d.source.id | nodeObj.id === d.target.id ? 1 : 0.01;
            });
            isNodeHighlighted = true;
        } else {
            //Put them back to opacity=1
            nodes.style("opacity", 1);
            links.style("opacity", 1);
            isNodeHighlighted = false;
        }
    };

    var deleteParent = function (nodeId) {
        var nodesToDelete = [];
        var linksToDelete = [];
        recursivelyDelete(nodeId);
        function recursivelyDelete(nodeId) {
            var nodeObj = nodeLinkedInfo[nodeId];
            for (var childId in nodeObj.incoming) {
                linksToDelete.push(childId + "_" + nodeId);
                delete nodeObj.incoming[childId];
                var childObj = nodeLinkedInfo[childId];
                delete childObj.outgoing[nodeId];
                if (Object.keys(childObj.outgoing).length === 0) {
                    nodesToDelete.push(childId);
                    recursivelyDelete(childId);
                }
            }
        }

        graphUtilityObj.deleteNodesAndLinksFromGraphObj(nodeId, nodesToDelete, linksToDelete);
        thisRef.update();
    };

    var deleteChildren = function (nodeId) {
        var nodesToDelete = [];
        var linksToDelete = [];
        recursivelyDelete(nodeId);
        function recursivelyDelete(nodeId) {
            var nodeObj = nodeLinkedInfo[nodeId];
            for (var childId in nodeObj.outgoing) {
                linksToDelete.push(nodeId + "_" + childId);
                delete nodeObj.outgoing[childId];
                var childObj = nodeLinkedInfo[childId];
                delete childObj.incoming[nodeId];
                if (Object.keys(childObj.incoming).length === 0) {
                    nodesToDelete.push(childId);
                    recursivelyDelete(childId);
                }
            }
        }

        graphUtilityObj.deleteNodesAndLinksFromGraphObj(nodeId, nodesToDelete, linksToDelete);
        thisRef.update();
    };

    var enableSelection = function () {
        svgParent.on("mousedown", function () {
            if (d3.event.button === 0) {
                selectedNodes = [];
                d3.selectAll('g.node.selected').classed("selected", false);
            }
            var p = d3.mouse(this);
            svgParent.append("rect")
                .attr({
                    rx: 6,
                    ry: 6,
                    class: "selection",
                    x: p[0],
                    y: p[1],
                    width: 0,
                    height: 0
                });
        })
            .on("mousemove", function () {
                var s = svgParent.select("rect.selection");
                if (!s.empty()) {
                    var p = d3.mouse(this),
                        d = {
                            x: parseInt(s.attr("x"), 10),
                            y: parseInt(s.attr("y"), 10),
                            width: parseInt(s.attr("width"), 10),
                            height: parseInt(s.attr("height"), 10)
                        },
                        move = {
                            x: p[0] - d.x,
                            y: p[1] - d.y
                        };
                    if (move.x < 1 || (move.x * 2 < d.width)) {
                        d.x = p[0];
                        d.width -= move.x;
                    } else {
                        d.width = move.x;
                    }
                    if (move.y < 1 || (move.y * 2 < d.height)) {
                        d.y = p[1];
                        d.height -= move.y;
                    } else {
                        d.height = move.y;
                    }
                    s.attr(d);
                    d3.selectAll('g.node > circle').each(function (node_data) {
                        if (!d3.select(this).classed("selected")) {
                            var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
                            var mainSvgTranslateObj = mainSvgTransformObj.translate;
                            var scaling = mainSvgTransformObj.scale[0];
                            var nodeDataX = node_data.x + mainSvgTranslateObj[0]/scaling;
                            var nodeDataY = node_data.y + mainSvgTranslateObj[1]/scaling;
                            if (scaling*(nodeDataX - nodeRadius) >= d.x &&
                                scaling*(nodeDataX + nodeRadius) <= d.x + d.width &&
                                scaling*(nodeDataY - nodeRadius) >= d.y &&
                                scaling*(nodeDataY + nodeRadius) <= d.y + d.height) {
                                d3.select(this.parentNode).classed("selected", true);
                                selectedNodes[node_data.name] = 1;
                            } else {
                                d3.select(this.parentNode).classed("selected", false);
                                delete selectedNodes[node_data.name];
                            }
                        }
                    });
                }
            })
            .on("mouseup", function () {
                //Remove selection frame
                svgParent.selectAll("rect.selection").remove();
            });
    };

    var updateGraph = function (graphJson, rootNode) {
        var entityNamePrefix = ["RF", "DS", "DRD", "Cube", "WB", "DB"];
        var childDepth = rootNode.level + 1;
        var startIndex = 0;
        if (graphUtilityObj.paneNodesCount[childDepth]) {
            startIndex = graphUtilityObj.paneNodesCount[childDepth].length;
        }
        var i, id;
        for (i = startIndex; i < startIndex + 10; i++) {
            id = entityNamePrefix[childDepth] + i;
            graphJson[rootNode.id].outgoing.push(id);
            graphJson[id] = {
                "name": id,
                "depth": childDepth
            };
        }
        var parentDepth = rootNode.level - 1;
        startIndex = 0;
        if (graphUtilityObj.paneNodesCount[parentDepth]) {
            startIndex = graphUtilityObj.paneNodesCount[parentDepth].length - 1;
        }
        for (i = startIndex; i < startIndex + 3; i++) {
            id = entityNamePrefix[parentDepth] + i;
            graphJson[rootNode.id].incoming.push(id);
            graphJson[id] = {
                "name": id,
                "depth": parentDepth
            };
        }
        return graphJson;
    };

    var showContextMenu = function (nodeObj) {
        $.contextMenu('destroy');
        var actionItems = {
            showInComingNodes: {
                name: "Connected Nodes...",
                callback: function () {
                    var graphJson = {};
                    graphJson[nodeObj.id] = {
                        "name": nodeObj.name,
                        "depth": nodeObj.level,
                        "incoming": [],
                        "outgoing": []
                    };
                    graphJson = updateGraph(graphJson, nodeObj);
                    graphUtilityObj.getGraphObj(graphJson, nodeObj.name);
                    thisRef.update(nodeObj);
                }
            }
        };
        if (isNodeHighlighted) {
            actionItems.highLightNode = {
                name: "Remove Highlighting...",
                callback: function () {
                    highlightConnectedNodes(nodeObj);
                }
            };
        } else {
            actionItems.highLightNode = {
                name: "Apply Highlighting...",
                callback: function () {
                    highlightConnectedNodes(nodeObj);
                }
            };
        }
        actionItems.collapseChilds = {
            name: "Collapse Children...",
            callback: function () {
                nodeObj.outgoing = [];
                nodeObj.width = 25;
                deleteChildren(nodeObj.name);
            }
        };
        actionItems.collapseParents = {
            name: "Collapse Parents...",
            callback: function () {
                nodeObj.incoming = [];
                deleteParent(nodeObj.name);
            }
        };
        var selectedNodeIds = Object.keys(selectedNodes);
        if (selectedNodeIds.length > 1) {
            actionItems = {};
        }
        actionItems.createCab = {
            name: "Generate CAB...",
            callback: function () {
                if (selectedNodeIds.length === 0) {
                    alert(nodeObj.name);
                } else {
                    alert(selectedNodeIds.join());
                }
            }
        };
        $.contextMenu({
            selector: 'g.node',
            items: actionItems
        });
    };
}
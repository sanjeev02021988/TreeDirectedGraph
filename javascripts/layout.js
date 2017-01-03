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
    this.zoomInOut = function (incrementFactor) {
        svgParent.selectAll("rect.selection").remove();
        var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
        var newScaling = mainSvgTransformObj.scale[0] + incrementFactor;
        if(newScaling <= minZooming || newScaling >= maxZooming){
            return;
        }
        console.log("center:("+(-1 * mainSvgTransformObj.translate[0] + visibleWidth / 2)+","+(-1 * mainSvgTransformObj.translate[1] + visibleWidth / 2)+")");
        var xC = mainSvgTransformObj.translate[0] + (-1 * mainSvgTransformObj.translate[0] + visibleWidth / 2) * (1 - newScaling);
        var yC = mainSvgTransformObj.translate[1] + (-1 * mainSvgTransformObj.translate[1] + visibleHeight / 2) * (1 - newScaling);
        var newTranslatePos = [xC, yC];
        mainSvg.attr("transform", "translate(" + newTranslatePos + ")scale(" + newScaling + ")");
        addRectToSmallMap(newTranslatePos, newScaling);
        zoomIncrementFactor += incrementFactor;
    };

    var selectionEnabled = false;
    var translateVector = [0, 0];
    this.enableSelection = function (enableSelection) {
        selectionEnabled = enableSelection;
        if (selectionEnabled) {
            zoom.on("zoom.mousemove", null);
        }
    };
    var maxZooming = 2;
    var minZooming = 0.6;
    var prevMainSvgD3Translate = [0, 0];
    var prevMiniSvgD3Translate = [0, 0];
    var enableZooming = function () {
        zoom = d3.behavior.zoom()
            .scaleExtent([minZooming, maxZooming])
            .on("zoom", zoomed);

        function zoomed(events) {
            var mainSvgPosition = d3.transform(mainSvg.attr("transform")).translate;
            var scaling = d3.event.scale + zoomIncrementFactor;
            var newTranslatePos = mainSvgPosition;
            if (selectionEnabled) {
                /*var coordinates = d3.mouse(mainSvg.node());
                 var x = coordinates[0];
                 var y = coordinates[1];
                 newTranslatePos = [x * (scaling - 1), y * (scaling - 1)];*/
            } else {
                newTranslatePos = [mainSvgPosition [0] + d3.event.translate[0] - prevMainSvgD3Translate[0], mainSvgPosition[1] + d3.event.translate[1] - prevMainSvgD3Translate[1]];
                svgParent.selectAll("rect.selection").remove();
            }
            mainSvg.attr("transform", "translate(" + newTranslatePos + ")scale(" + scaling + ")");
            addRectToSmallMap(newTranslatePos, scaling);
            prevMainSvgD3Translate = d3.event.translate;
        }

        $("#ResetButton").on("click", reset);
        function reset() {
            mainSvg.attr("transform", "translate(0,0)scale(1)");
            zoom.translate([0, 0]).scale(1);
            addRectToSmallMap([0, 0], 1);
        }

        enableZoomingSmallMap();
    };

    var enableZoomingSmallMap = function () {
        zoomSmallMap = d3.behavior.zoom()
            .scaleExtent([1, 1])
            .on("zoom", zoomed);
        function zoomed() {
            var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
            var mainSvgPosition = mainSvgTransformObj.translate;
            var mainSvgScaling = mainSvgTransformObj.scale[0];
            var newTranslatePos = [-1 * mainSvgPosition [0] / mainSvgScaling * graphUtilityObj.scalingOfSmallMap() + d3.event.translate[0] - prevMiniSvgD3Translate[0],
                    -1 * mainSvgPosition[1] / mainSvgScaling * graphUtilityObj.scalingOfSmallMap() + d3.event.translate[1] - prevMiniSvgD3Translate[1]];

            var rectObj = d3.select(".miniSVG").select("rect");
            rectObj.attr("transform", "translate(" + newTranslatePos + ")");
            var scalingFactor = 1 / graphUtilityObj.scalingOfSmallMap();
            var x = -1 * newTranslatePos[0] * scalingFactor * mainSvgScaling,
                y = -1 * newTranslatePos[1] * scalingFactor * mainSvgScaling;
            mainSvg.attr("transform", "translate(" + [x, y] + ")scale(" + d3.transform(mainSvg.attr("transform")).scale[0] + ")");
            prevMiniSvgD3Translate = d3.event.translate;
        }
    };

    var appendSVG = function () {
        //Add svg to the body.
        svgParent = d3.selectAll(".graphSVG");

        svg = svgParent
            .attr('width', width)
            .attr('height', height)
            .append("g");
        d3.select(".miniSVG").call(zoomSmallMap);
        d3.select(".mainSVG").call(zoom);
        mainSvg = d3.select(".mainSVG")
            .select("g");
        addRectToSmallMap([0, 0]);
    };

    var addRectToSmallMap = function (initialCoordinates, scalling) {
        if (!initialCoordinates) {
            initialCoordinates = graphUtilityObj.getRenderingCoordinates(mainSvg);
        }
        if (!scalling) {
            scalling = 1;
        }
        var scalingFactor = graphUtilityObj.scalingOfSmallMap() / scalling;
        var rect = d3.select(".miniSVG").select("rect");
        if (!rect[0][0]) {
            rect = d3.select(".miniSVG").append("rect");
        }
        rect.attr({
            rx: 2,
            ry: 2,
            class: "smallMapSelection",
            x: 0,
            y: 0,
            width: visibleWidth * scalingFactor - 4,
            height: visibleHeight * scalingFactor - 2,
            transform: "translate(" + [-1 * initialCoordinates[0] * scalingFactor + 1, -1 * initialCoordinates[1] * scalingFactor + 1] + ")"
        });
    };

    var enableArrowHeads = function () {
        //Providing support for creating arrow heads to the path.
        svg.append("defs").selectAll("marker")
            .data(["end"])               // Different link/path types can be defined here
            .enter().append("marker")    // This section adds in the arrows
            .attr("id", function (d) {
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
        tempLinkObj.style("stroke", function (d) {
            var dx = d.target.x - d.source.x;
            if (dx === 0) {
                return edgeColor;//"red"
            }
            return edgeColor;
        });
        tempLinkObj.attr("d", function (d) {
            var dx = d.target.x - d.source.x;
            var point = 0;
            if (dx === 0) {
                point = d.source.x - 90;
            } else {
                point = d.source.x + 90;
            }
            var source = d.source;
            var target = d.target;
            if (!d.rendered && currentNodObj !== null) {
                source = currentNodObj;
                target = currentNodObj;
            }
            return "M" +
                source.x + "," +
                source.y + "C" + point + "," +
                source.y + " " + point + "," +
                target.y + " " +
                target.x + "," +
                target.y;
        }).transition().ease("linear").duration(600).attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y;
            var point = 0;
            if (dx === 0) {
                point = d.source.x - 90;
            } else {
                point = d.source.x + 90;
            }
            d.rendered = true;
            return "M" +
                d.source.x + "," +
                d.source.y + "C" + point + "," +
                d.source.y + " " + point + "," +
                d.target.y + " " +
                d.target.x + "," +
                d.target.y;
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
        nodes.attr("transform", function (d) {
            var x = d.x, y = d.y;
            if (!d.rendered) {
                if (currentNodObj === null) {
                    x = 0;
                    y = 0;
                } else {
                    x = currentNodObj.x;
                    y = currentNodObj.y;
                }
            }
            return "translate(" + x + "," + y + ")";
        }).transition().ease("linear").duration(600).attr("transform", function (d) {
            d.rendered = true;
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
        function contextMenuCallback (d){
            d3.event.preventDefault();
            showContextMenu(d);
        }
        //Adding events to the node.
        nodes.on('contextmenu',contextMenuCallback)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .on('click', highlightConnectedNodes);
    };

    var nodeLinkedInfo = {};
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
        nodeLinkedInfo = {};
        graph.links.forEach(function (d) {
            initNodeObjLinkedInfo(d.source.id);
            initNodeObjLinkedInfo(d.target.id);
            nodeLinkedInfo[d.source.id].outgoing[d.target.id] = 1;
            nodeLinkedInfo[d.target.id].incoming[d.source.id] = 1;
        });
    };

    var highlightConnectedNodes = function (nodeObj, forwardDirection) {
        if (!isNodeHighlighted) {
            var highlightNodeMap = [];

            function highlight(nodeId, forwardDirection) {
                var nodeObj = nodeLinkedInfo[nodeId];
                if (highlightNodeMap[nodeId]) {
                    return;
                }
                highlightNodeMap[nodeId] = 1;
                if (typeof forwardDirection !== "boolean" || forwardDirection === true) {
                    for (var index in nodeObj.outgoing) {
                        highlight(index, true);
                    }
                }
                if (typeof forwardDirection !== "boolean" || forwardDirection === false) {
                    for (var index in nodeObj.incoming) {
                        highlight(index, false);
                    }
                }
            }

            highlight(nodeObj.id, forwardDirection);
            nodes.style("opacity", function (d) {
                return highlightNodeMap[d.id] ? 1 : 0.2;
            });
            links.style("opacity", function (d) {
                return highlightNodeMap[d.target.id] && highlightNodeMap[d.source.id] ? 1 : 0.01;
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
        var tempMainSVG = d3.select(".mainSVG");
        tempMainSVG.on("mousedown", function () {
            if (d3.event.button === 0) {
                selectedNodes = [];
                d3.selectAll('g.node.selected').classed("selected", false);
            }
            var p = d3.mouse(this);
            tempMainSVG.append("rect")
                .attr({
                    rx: 6,
                    ry: 6,
                    class: "selection",
                    x: p[0],
                    y: p[1],
                    width: 0,
                    height: 0
                });
        }).on("mousemove", function () {
            var s = tempMainSVG.select("rect.selection");
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
                        var mainSvgTransformObj = d3.transform(tempMainSVG.select("g").attr("transform"));
                        var mainSvgTranslateObj = mainSvgTransformObj.translate;
                        var scaling = mainSvgTransformObj.scale[0];
                        var nodeDataX = node_data.x + mainSvgTranslateObj[0] / scaling;
                        var nodeDataY = node_data.y + mainSvgTranslateObj[1] / scaling;
                        if (scaling * (nodeDataX - nodeRadius) >= d.x &&
                            scaling * (nodeDataX + nodeRadius) <= d.x + d.width &&
                            scaling * (nodeDataY - nodeRadius) >= d.y &&
                            scaling * (nodeDataY + nodeRadius) <= d.y + d.height) {
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
                tempMainSVG.selectAll("rect.selection").remove();
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
    var currentNodObj = null;
    var showContextMenu = function (nodeObj) {
        currentNodObj = nodeObj;
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
            actionItems.highLightParent = {
                name: "Highlight Parent...",
                callback: function () {
                    highlightConnectedNodes(nodeObj, false);
                }
            };
            actionItems.highLightChildren = {
                name: "Highlight Children...",
                callback: function () {
                    highlightConnectedNodes(nodeObj, true);
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
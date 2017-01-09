function Layout() {
    var thisRef = this;

    var containerId = "";
    var graph = null;
    var width = 0,
        height = 0;
    var visibleWidth = 0,
        visibleHeight = 0;
    var nodeRadius = 10;
    var edgeType = "CURVE";
    var edgeColor = "#999999";
    var labelDirection = "RIGHT";

    var links = null;
    var nodes = null;
    var selectedNodes = [];
    var isNodeHighlighted = false;

    var svg = null,
        svgParent = null,
        mainSvg = null;

    //Providing support for dynamic generation of colors.
    var color = d3.scale.category20();
    var tip = null;
    var zoom = null;
    var zoomSmallMap = null;
    var maxZooming = 3,
        minZooming = 0.5;

    var configObj = null;
    var graphUtilityObj = null;

    thisRef.getGraphUtilityObj = function () {
        return graphUtilityObj;
    };

    thisRef.init = function (containerConfig, mainSvgConfig, tConfigObj) {
        containerId = containerConfig.id;
        visibleWidth = containerConfig.width;
        visibleHeight = containerConfig.height;
        width = mainSvgConfig.width;
        height = mainSvgConfig.height;
        configObj = tConfigObj;
        nodeRadius = configObj.style.node.radius;
        edgeType = configObj.style.edge.type;
        edgeColor = configObj.style.edge.color;
        labelDirection = configObj.style.label.direction;
        graphUtilityObj = new GraphUtility(visibleHeight, visibleWidth, mainSvgConfig.x0, mainSvgConfig.y0, configObj.paneCount);
        //Convert tree json into graph obj which has nodes and edges.
        graph = graphUtilityObj.getGraphObj(tConfigObj.data, tConfigObj.rootNodeId);
        currentNodObj = graphUtilityObj.currentRootObj;
    };

    thisRef.reDraw = function (tStyleObj) {
        nodeRadius = tStyleObj.node.radius;
        edgeType = tStyleObj.edge.type;
        edgeColor = tStyleObj.edge.color;
        labelDirection = tStyleObj.label.direction;
        svg.remove();
        graphUtilityObj.updateNodesAndLinksArr(tStyleObj.node.minSpacing);
        nodes = null;
        links = null;
        thisRef.draw();
    };

    thisRef.update = function () {
        updateLayout();
        nodes.exit().transition().remove();
        links.exit().transition().remove();
        var initialCoordinates = graphUtilityObj.getRenderingCoordinates(mainSvg);
        var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
        mainSvg.attr("transform", "translate(" + initialCoordinates + ")scale(" + mainSvgTransformObj.scale[0] + ")");
        addRectToSmallMap();
    };

    thisRef.draw = function () {
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

    this.zoomInOut = function (incrementFactor) {
        if (selectionEnabled) {
            return;
        }
        svgParent.selectAll("rect.selection").remove();
        var newScaling = zoom.scale() + incrementFactor;
        if (newScaling <= minZooming || newScaling >= maxZooming) {
            return;
        }
        var center = [visibleWidth / 2, visibleHeight / 2],
            translate = zoom.translate(),
            scale = zoom.scale(),
            translate0 = [],
            l = [];

        translate0 = [(center[0] - translate[0]) / scale, (center[1] - translate[1]) / scale];
        l = [translate0[0] * newScaling + translate[0], translate0[1] * newScaling + translate[1]];

        translate[0] += center[0] - l[0];
        translate[1] += center[1] - l[1];
        mainSvg.attr("transform", "translate(" + translate + ")scale(" + newScaling + ")");
        addRectToSmallMap(translate, newScaling);
        zoom.scale(newScaling).translate(translate);
    };

    var selectionEnabled = false;
    this.enableSelection = function (enableSelection) {
        selectionEnabled = enableSelection;
    };

    var enableZooming = function () {
        zoom = d3.behavior.zoom()
            .scaleExtent([minZooming, maxZooming])
            .on("zoom", zoomed);

        $("#ResetButton").on("click", reset);
        enableZoomingSmallMap();

        function zoomed() {
            if (selectionEnabled) {
                var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
                zoom.scale(mainSvgTransformObj.scale[0]);
                zoom.translate(mainSvgTransformObj.translate);
            } else {
                var scaling = d3.event.scale;
                var newTranslatePos = d3.event.translate;
                svgParent.selectAll("rect.selection").remove();
                mainSvg.attr("transform", "translate(" + newTranslatePos + ")scale(" + scaling + ")");
                addRectToSmallMap(newTranslatePos, scaling);
            }
        }

        function reset() {
            zoom.translate([0, 0]).scale(1);
            mainSvg.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
            addRectToSmallMap(zoom.translate(), zoom.scale());
        }
    };

    var enableZoomingSmallMap = function () {
        zoomSmallMap = d3.behavior.zoom()
            .scaleExtent([1, 1])
            .on("zoom", zoomed);
        function zoomed() {
            var mainSvgScaling = d3.transform(mainSvg.attr("transform")).scale[0];
            var newTranslatePos = d3.event.translate;

            d3.select(".miniSVG").select("rect")
                .attr("transform", "translate(" + newTranslatePos + ")");
            zoomSmallMap.translate(newTranslatePos);

            var scalingFactor = 1 / graphUtilityObj.scalingOfSmallMap();
            var x = -1 * newTranslatePos[0] * scalingFactor * mainSvgScaling,
                y = -1 * newTranslatePos[1] * scalingFactor * mainSvgScaling;
            zoom.translate([x, y]).scale(mainSvgScaling);
            mainSvg.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
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
        var newTranslatePosition = [-1 * initialCoordinates[0] * scalingFactor + 1, -1 * initialCoordinates[1] * scalingFactor + 1];
        rect.attr({
            rx: 2,
            ry: 2,
            class: "smallMapSelection",
            x: 0,
            y: 0,
            width: visibleWidth * scalingFactor - 4,
            height: visibleHeight * scalingFactor - 2,
            transform: "translate(" + newTranslatePosition + ")"
        });
        zoomSmallMap.translate(newTranslatePosition);
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

    var renderEdge = function () {
        var tempLinkObj = links;
        //Appending edges to the layout.
        tempLinkObj.style("stroke", function (d) {
            var dx = d.target.x - d.source.x;
            if (dx === 0) {
                return edgeColor;//"red"
            }
            return edgeColor;
        });
        /*links.exit().transition().duration(600).attr("d", function (d) {
            var dx = d.target.x - d.source.x;
            var point = 0;
            if (dx === 0) {
                point = d.source.x - 90;
            } else {
                point = d.source.x + 90;
            }
            return "M" +
                currentNodObj.x + "," +
                currentNodObj.y + "C" + point + "," +
                currentNodObj.y + " " + point + "," +
                currentNodObj.y + " " +
                currentNodObj.x + "," +
                currentNodObj.y;
        });*/
        tempLinkObj.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                point = 0;
            var source = d.source;
            var target = d.target;
            if (!d.rendered && currentNodObj !== null) {
                source = currentNodObj;
                target = currentNodObj;
            }
            var pathStr = "M" +
                source.x + "," + source.y;
            if (edgeType === "CURVE") {
                if (dx === 0) {
                    point = d.source.x - 90;
                } else {
                    point = d.source.x + 90;
                }
                pathStr += "C" + point + "," +
                    source.y + " " + point + "," +
                    target.y + " ";
            }else{
                pathStr += "A0,0 0 0,1 ";
            }
            pathStr += target.x + "," + target.y;
            return pathStr;
        }).transition().ease("linear").duration(600).attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                point = 0;
            d.rendered = true;
            var source = d.source, target = d.target;
            var pathStr = "M" +
                source.x + "," + source.y;
            if (edgeType === "CURVE") {
                if (dx === 0) {
                    point = d.source.x - 90;
                } else {
                    point = d.source.x + 90;
                }
                pathStr += "C" + point + "," +
                    source.y + " " + point + "," +
                    target.y + " ";
            }else{
                pathStr += "A0,0 0 0,1 ";
            }
            pathStr += target.x + "," + target.y;
            return pathStr;
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
        nodes.exit().transition()
            .duration(600)
            .attr("transform", function() {
                return "translate(" + currentNodObj.x + "," + currentNodObj.y + ")";
            })
            .remove();
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
            return "translate(" + [x, y] + ")";
        }).transition().delay(600).ease("linear").duration(600).attr("transform", function (d) {
            d.rendered = true;
            var x = d.x;
            var y = d.y;
            return "translate(" + [x, y] + ")";
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
        function contextMenuCallback(d) {
            d3.event.preventDefault();
            showContextMenu(d);
        }

        //Adding events to the node.
        nodes.on('contextmenu', contextMenuCallback)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .on('click', thisRef.highlightConnectedNodes);
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

    this.highlightConnectedNodes = function (nodeObj, forwardDirection) {
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

    this.deleteParent = function (nodeId) {
        var nodesToDelete = [];
        var linksToDelete = [];
        recursivelyDelete(nodeId);
        function recursivelyDelete(nodeId) {
            var nodeObj = nodeLinkedInfo[nodeId];
            if (!nodeObj) {
                return;
            }
            for (var childId in nodeObj.incoming) {
                var childObj = nodeLinkedInfo[childId];
                if (Object.keys(childObj.outgoing).length === 1) {
                    nodesToDelete.push(childId);
                    linksToDelete.push(childId + "_" + nodeId);
                    delete nodeObj.incoming[childId];
                    delete childObj.outgoing[nodeId];
                    recursivelyDelete(childId);
                }
            }
        }

        graphUtilityObj.deleteNodesAndLinksFromGraphObj(nodeId, nodesToDelete, linksToDelete);
        thisRef.update();
    };

    this.deleteChildren = function (nodeId) {
        var nodesToDelete = [];
        var linksToDelete = [];

        recursivelyDelete(nodeId);
        function recursivelyDelete(nodeId) {
            var nodeObj = nodeLinkedInfo[nodeId];
            if (!nodeObj) {
                return;
            }
            for (var childId in nodeObj.outgoing) {
                var childObj = nodeLinkedInfo[childId];
                if (Object.keys(childObj.incoming).length === 1) {
                    nodesToDelete.push(childId);
                    linksToDelete.push(nodeId + "_" + childId);
                    delete nodeObj.outgoing[childId];
                    delete childObj.incoming[nodeId];
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

    this.updateGraph = function (graphJson, rootNode) {
        graphUtilityObj.getGraphObj(graphJson, rootNode.name);
        thisRef.update();
    };

    this.getSelectedNodes = function () {
        return selectedNodes;
    };

    this.isNodesHighlighted = function () {
        return isNodeHighlighted;
    };

    var currentNodObj = null;
    var showContextMenu = function (nodeObj) {
        currentNodObj = nodeObj;
        $.contextMenu('destroy');
        var actionItems = configObj.getContextMenuItemsCallback(nodeObj, thisRef);
        $.contextMenu({
            selector: 'g.node',
            items: actionItems
        });
    };
}
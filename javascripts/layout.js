function Layout() {
    var thisRef = this;

    var graph = null,
        links = null,
        nodes = null;

    var containerId = "";
    var visibleWidth = 0,
        visibleHeight = 0;

    var svg = null,
        svgParent = null,
        mainSvg = null;

    var tip = null;
    var selectedNodes = [],
        selectionEnabled = false;
    var isNodeHighlighted = false;
    var nodeRadius = 0;
    var nodeLinkedInfo = {};
    var currentNodObj = null;

    var zoom = null,
        zoomSmallMap = null,
        maxZooming = 3,
        minZooming = 0.5;

    var configObj = null,
        graphUtilityObj = null,
        edgeUtilityObj = new EdgeUtility(),
        nodeUtilityObj = new NodeUtility();

    thisRef.updateDimensions = function (tWidth, tHeight) {
        visibleWidth = tWidth;
        visibleHeight = tHeight;
        svgParent
            .attr('width', visibleWidth)
            .attr('height', visibleHeight)
        graphUtilityObj.updateDimensions(tWidth, tHeight);
    };

    thisRef.getGraphUtilityObj = function () {
        return graphUtilityObj;
    };

    thisRef.getSelectedNodes = function () {
        return selectedNodes;
    };

    thisRef.isNodesHighlighted = function () {
        return isNodeHighlighted;
    };

    thisRef.enableSelection = function (enableSelection) {
        selectionEnabled = enableSelection;
    };

    thisRef.init = function (containerConfig, tConfigObj) {
        containerId = containerConfig.id;
        visibleWidth = containerConfig.width;
        visibleHeight = containerConfig.height;
        configObj = tConfigObj;
        edgeUtilityObj.init(configObj.style.edge);
        nodeUtilityObj.init(configObj.style.node);
        nodeRadius = parseInt(configObj.style.node.radius);
        graphUtilityObj = new GraphUtility(containerConfig, configObj);
        //Convert tree json into graph obj which has nodes and edges.
        graph = graphUtilityObj.getGraphObj(tConfigObj.data, tConfigObj.rootNodeId);
        currentNodObj = graphUtilityObj.currentRootObj;
    };

    thisRef.reDraw = function (tStyleObj) {
        edgeUtilityObj.init(configObj.style.edge);
        nodeUtilityObj.init(configObj.style.node);
        nodeRadius = parseInt(configObj.style.node.radius);
        svg.remove();
        graphUtilityObj.updateNodesAndLinksArr(tStyleObj.node.minSpacing);
        nodes = null;
        links = null;
        thisRef.draw();
    };

    thisRef.update = function () {
        updateLayout();
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
        translateToCenter();
    };

    var translateToCenter = function () {
        var initialCoordinates = graphUtilityObj.getRenderingCoordinates(mainSvg);
        var mainSvgTransformObj = d3.transform(mainSvg.attr("transform"));
        mainSvg.attr("transform", "translate(" + initialCoordinates + ")scale(" + mainSvgTransformObj.scale[0] + ")");
        addRectToSmallMap(initialCoordinates);
        zoom.translate(initialCoordinates);
    };

    var initializeLayout = function () {
        enableZooming();
        appendSVG();
        edgeUtilityObj.enableArrowHeads(svg, nodeRadius);
        enableToolTip();
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
            .attr('width', visibleWidth)
            .attr('height', visibleHeight)
            .append("g");

        d3.select(".miniSVG").call(zoomSmallMap);
        d3.select(".mainSVG").call(zoom);

        mainSvg = d3.select(".mainSVG")
            .select("g");
        d3.select(".mainSVG").on("click", function () {
            isNodeHighlighted = true;
            thisRef.highlightConnectedNodes();
        });

        addRectToSmallMap([0, 0]);
    };

    var addRectToSmallMap = function (initialCoordinates, scaling) {
        if (!initialCoordinates) {
            initialCoordinates = graphUtilityObj.getRenderingCoordinates(mainSvg);
        }
        if (!scaling) {
            scaling = 1;
        }
        var scalingFactor = graphUtilityObj.scalingOfSmallMap() / scaling;
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
        edgeUtilityObj.renderEdge(links, currentNodObj);
    };

    var drawNode = function () {
        if (!nodes) {
            nodes = svg.selectAll('.node-point');
        }
        nodes = nodes.data(graph.nodes, function (d) {
            return d.id;
        });
        nodeUtilityObj.renderNode(nodes, currentNodObj);
        attachEventsToNode();
    };

    var attachEventsToNode = function () {
        function contextMenuCallback(nodeObj) {
            d3.event.preventDefault();
            currentNodObj = nodeObj;
            configObj.callbacks.onNodeRightClick(nodeObj, thisRef);
        }

        var dblClickEventInPropagation = false;

        function nodeDblClickCallback(nodeObj) {
            d3.event.stopPropagation();
            dblClickEventInPropagation = true;
            currentNodObj = nodeObj;
            configObj.callbacks.onNodeDblClick(nodeObj, thisRef);
        }

        function nodeClickCallback(nodeObj) {
            var self = this;
            d3.event.stopPropagation();
            dblClickEventInPropagation = false;
            setTimeout(function () {
                if (dblClickEventInPropagation) {
                    return;
                }
                if (selectionEnabled) {
                    var selectedClass = getSelectionClass();
                    if (!selectedNodes[nodeObj.name]) {
                        d3.select(self).classed(selectedClass, true);
                        selectedNodes[nodeObj.name] = 1;
                    } else {
                        d3.select(self).classed(selectedClass, false);
                        delete selectedNodes[nodeObj.name];
                    }
                } else {
                    configObj.callbacks.onNodeClick(nodeObj, thisRef);
                }
            }, 300);
        }

        //Adding events to the node.
        nodes.on('contextmenu', contextMenuCallback)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .on('click', nodeClickCallback)
            .on('dblclick', nodeDblClickCallback);
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
        nodeLinkedInfo = {};
        graph.links.forEach(function (d) {
            initNodeObjLinkedInfo(d.source.id);
            initNodeObjLinkedInfo(d.target.id);
            nodeLinkedInfo[d.source.id].outgoing[d.target.id] = 1;
            nodeLinkedInfo[d.target.id].incoming[d.source.id] = 1;
        });
    };

    this.highlightConnectedNodes = function (nodeObj, forwardDirection) {
        if (!configObj.style.node.CSS.disable && !configObj.style.edge.CSS.disable) {
            return;
        }
        if (!isNodeHighlighted) {
            var connectedNodeMap = [];

            getConnectedNodeMap(connectedNodeMap, nodeObj.id, forwardDirection);
            nodes.classed(configObj.style.node.CSS.disable, function (d) {
                return !connectedNodeMap[d.id];
            });
            links.classed(configObj.style.edge.CSS.disable, function (d) {
                return !(connectedNodeMap[d.target.id] && connectedNodeMap[d.source.id]);
            });
            isNodeHighlighted = true;
        } else {
            //Put them back to opacity=1
            nodes.classed(configObj.style.node.CSS.disable, false);
            links.classed(configObj.style.edge.CSS.disable, false);
            isNodeHighlighted = false;
        }
    };

    this.keepLineage = function (nodeObj, keepSelf, forwardDirection) {
        var connectedNodeMap = [];
        var nodesToDelete = [];
        var linksToDelete = [];
        if (keepSelf) {
            connectedNodeMap[nodeObj.id] = 1;
        } else {
            getConnectedNodeMap(connectedNodeMap, nodeObj.id, forwardDirection);
        }
        graph.nodes.forEach(function (d) {
            if (!connectedNodeMap[d.id]) {
                nodesToDelete.push(d.id);
            }
        });
        graph.links.forEach(function (d) {
            if (!(connectedNodeMap[d.target.id] && connectedNodeMap[d.source.id])) {
                var parentObj = nodeLinkedInfo[d.source.id];
                var childObj = nodeLinkedInfo[d.target.id];
                linksToDelete.push(d.source.id + "_" + d.target.id);
                delete parentObj.outgoing[d.target.id];
                delete childObj.incoming[d.source.id];
            }
        });
        graphUtilityObj.deleteNodesAndLinksFromGraphObj(nodeObj.id, nodesToDelete, linksToDelete);
        thisRef.update();
    };

    var getConnectedNodeMap = function (connectedNodeMap, nodeId, forwardDirection) {
        if (connectedNodeMap[nodeId]) {
            return;
        }
        connectedNodeMap[nodeId] = 1;
        var nodeObj = nodeLinkedInfo[nodeId];
        if (!nodeObj) {
            return;
        }
        if (typeof forwardDirection !== "boolean" || forwardDirection === true) {
            for (var index in nodeObj.outgoing) {
                getConnectedNodeMap(connectedNodeMap, index, true);
            }
        }
        if (typeof forwardDirection !== "boolean" || forwardDirection === false) {
            for (var index in nodeObj.incoming) {
                getConnectedNodeMap(connectedNodeMap, index, false);
            }
        }
    };


    this.deleteNodes = function(nodeIdList){
        var linksToDelete = [];
        nodeIdList.forEach(function(nodeId){
            var nodeObj = nodeLinkedInfo[nodeId];
            if (!nodeObj) {
                return;
            }
            graph.links.forEach(function(d){
                if(d.target.id === nodeId || d.source.id === nodeId){
                    var parentObj = nodeLinkedInfo[d.source.id];
                    var childObj = nodeLinkedInfo[d.target.id];
                    linksToDelete.push(d.source.id + "_" + d.target.id);
                    delete parentObj.outgoing[d.target.id];
                    delete childObj.incoming[d.source.id];
                }
            });
        });
        graphUtilityObj.deleteNodesAndLinksFromGraphObj(null, nodeIdList, linksToDelete);
        thisRef.update();
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

        if (nodesToDelete.length === 0 && linksToDelete.length === 0) {
            return;
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

        if (nodesToDelete.length === 0 && linksToDelete.length === 0) {
            return;
        }
        graphUtilityObj.deleteNodesAndLinksFromGraphObj(nodeId, nodesToDelete, linksToDelete);
        thisRef.update();
    };

    var getSelectionClass = function () {
        var selectedClass = configObj.style.node.CSS.select;
        if (!selectedClass) {
            selectedClass = "selected";
        }
        return selectedClass;
    };

    var enableSelection = function () {
        var tempMainSVG = d3.select(".mainSVG");
        var selectedClass = getSelectionClass();
        var dragStart = false;
        var mouseDown = false;
        var isMouseMovedForFirtTime = false;
        var initPosition = [];
        tempMainSVG.on("mousedown", function () {
            mouseDown = true;
            dragStart = false;
            isMouseMovedForFirtTime = false;
            var p = d3.mouse(this);
            initPosition = p;
            if (!selectionEnabled) {
                return;
            }
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
            if (mouseDown) {
                dragStart = true;
            }
            if (!selectionEnabled) {
                return;
            }
            var currentPosition = d3.mouse(this);
            if (Math.abs(initPosition[0] - currentPosition[0]) < 2 ||
                Math.abs(initPosition[1] - currentPosition[1]) < 2) {
                return;
            }
            if (mouseDown && !isMouseMovedForFirtTime && d3.event.which === 1) {
                isMouseMovedForFirtTime = true;
                selectedNodes = [];
                d3.selectAll('g.node-point.' + selectedClass).classed(selectedClass, false);
            }
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
                d3.selectAll('g.node-point > circle').each(function (node_data) {
                    if (!d3.select(this).classed(selectedClass)) {
                        var mainSvgTransformObj = d3.transform(tempMainSVG.select("g").attr("transform"));
                        var mainSvgTranslateObj = mainSvgTransformObj.translate;
                        var scaling = mainSvgTransformObj.scale[0];
                        var nodeDataX = node_data.x + mainSvgTranslateObj[0] / scaling;
                        var nodeDataY = node_data.y + mainSvgTranslateObj[1] / scaling;
                        if (scaling * (nodeDataX - nodeRadius) >= d.x &&
                            scaling * (nodeDataX + nodeRadius) <= d.x + d.width &&
                            scaling * (nodeDataY - nodeRadius) >= d.y &&
                            scaling * (nodeDataY + nodeRadius) <= d.y + d.height) {
                            d3.select(this.parentNode).classed(selectedClass, true);
                            selectedNodes[node_data.name] = 1;
                        } else {
                            d3.select(this.parentNode).classed(selectedClass, false);
                            delete selectedNodes[node_data.name];
                        }
                    }
                });
            }
        }).on("mouseup", mouseUp)
            .on("mouseleave", mouseUp);
        function mouseUp() {
            mouseDown = false;
            //Remove selection frame
            tempMainSVG.selectAll("rect.selection").remove();
            if (!dragStart && d3.event.which === 1) {
                if (selectionEnabled) {
                    return;
                }
                console.log("cleaning selection in mouseup");
                selectedNodes = [];
                d3.selectAll('g.node-point.' + selectedClass).classed(selectedClass, false);
            }
            dragStart = false;
        }
    };

    this.updateGraph = function (graphJson, rootNode) {
        graphUtilityObj.getGraphObj(graphJson, rootNode.name);
        thisRef.update();
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
}
function Layout() {
    var thisRef = this;
    var force = null;
    var graph = null;
    var width = 0;
    var height = 0;
    var svg = null;
    var tip = null;
    var nodeRadius = 20;
    var link = null;
    var node = null;
    //Providing support for dynamic generation of colors.
    var color = d3.scale.category20();
    var highlightConnectedNodes = null;
    var isNodeHighlighted = false;
    var svgParent = null;
    var edgeType = "STRAIGHT";
    var edgeColor = "#999999";
    var labelDirection = "RIGHT";
    var containerId = "";

    thisRef.init = function (tContainerId, tGraph, tWidth, tHeight, tNodeRadius) {
        containerId = tContainerId;
        graph = tGraph;
        width = tWidth;
        height = tHeight;
        nodeRadius = tNodeRadius;
        initializeLayout();
        thisRef.drawEdge();
        thisRef.drawNode();
        highlightConnectedNodes = enableHighlighting();
        //enableDragging();
        enableSelection();
    };
    var draggingEnabled = true;
    function enableDragging (){
        var drag = d3.behavior.drag()
            .on("drag", function(d,i) {
                d.x += d3.event.dx;
                d.y += d3.event.dy;
                d3.select(this).attr("transform", function(d,i){
                    return "translate(" + [ d.x,d.y ] + ")"
                });
                renderEdge(true);
            });
        node.call(drag);
    }
    var selectedNodes = [];
    function enableSelection(){
        svgParent.on( "mousedown", function() {
                if(d3.event.button === 0) {
                    selectedNodes = [];
                    d3.selectAll( 'g.node.selected').classed( "selected", false);
                }
                var p = d3.mouse( this);
                svgParent.append( "rect")
                    .attr({
                        rx      : 6,
                        ry      : 6,
                        class   : "selection",
                        x       : p[0],
                        y       : p[1],
                        width   : 0,
                        height  : 0
                    })
            })
            .on( "mousemove", function() {
                /*if(draggingEnabled){
                    svgParent.selectAll( "rect.selection").remove();
                    return;
                }*/
                var s = svgParent.select( "rect.selection");
                if( !s.empty()) {
                    var p = d3.mouse( this),
                        d = {
                            x       : parseInt( s.attr( "x"), 10),
                            y       : parseInt( s.attr( "y"), 10),
                            width   : parseInt( s.attr( "width"), 10),
                            height  : parseInt( s.attr( "height"), 10)
                        },
                        move = {
                            x : p[0] - d.x,
                            y : p[1] - d.y
                        };
                    if( move.x < 1 || (move.x*2<d.width)) {
                        d.x = p[0];
                        d.width -= move.x;
                    } else {
                        d.width = move.x;
                    }
                    if( move.y < 1 || (move.y*2<d.height)) {
                        d.y = p[1];
                        d.height -= move.y;
                    } else {
                        d.height = move.y;
                    }
                    s.attr( d);
                    d3.selectAll( 'g.node > circle').each( function( node_data, i) {
                        if(!d3.select( this).classed( "selected")){
                            //Inner circle inside selection frame
                            if(node_data.x-nodeRadius>=d.x && node_data.x+nodeRadius<=d.x+d.width && node_data.y-nodeRadius>=d.y && node_data.y+nodeRadius<=d.y+d.height){
                                d3.select( this.parentNode).classed( "selected", true);
                                selectedNodes[node_data.name] = 1;
                            }else{
                                d3.select( this.parentNode).classed( "selected", false);
                                delete selectedNodes[node_data.name];
                            }
                        }
                    });
                }
            })
            .on( "mouseup", function() {
                //Remove selection frame
                svgParent.selectAll( "rect.selection").remove();
            });
    }

    thisRef.reDraw = function (tRadius, tEdgeType, tEdgeColor, tLabelDirection) {
        nodeRadius = tRadius;
        edgeType = tEdgeType;
        edgeColor = tEdgeColor;
        labelDirection = tLabelDirection;
        svgParent.remove();
        thisRef.init(containerId, graph, width, height, nodeRadius);
    };

    thisRef.drawEdge = function () {
        //Describing properties of the edges.
        link = svg.append("g").selectAll("path")
            .data(graph.links)
            .enter().append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)")
            .style("stroke", edgeColor);
        renderEdge();
    };

    thisRef.drawNode = function () {
        //Describing properties of the nodes.
        node = svg.selectAll('.node')
            .data(graph.nodes).enter()
            .append("g")
            .attr("class", "node");

        //Adding circle to the g tag of the node.
        node.append("circle").attr({
            'r': nodeRadius + 4,
            class:'outer'});
        node.append("circle").attr('r', nodeRadius)
            .style("fill", function (d) {
                return color(d.level);
            });
        renderNode();
        attachLabelToNode();
        attachEventsToNode();
    };

    thisRef.update = function (sourceNode) {
        link = link.data(graph.links, function (d) {
            return d.source.name + "-" + d.target.name;
        });
        link.enter().append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)")
            .style("stroke", edgeColor);

        node = node.data(graph.nodes, function (d) {
            return d.name;
        });
        var newNodes = node.enter().append("g");
        newNodes.attr("class", "node").append("circle").attr('r', nodeRadius)
            .style("fill", function (d) {
                d.new = true;
                return color(d.level);
            });
        attachLabelToNode(newNodes);
        highlightConnectedNodes = enableHighlighting();
        attachEventsToNode();
        renderNode();
        renderEdge();
    };

    var renderNode = function (parentNode, newNodes) {
        /*if(parentNode){
         /*newNodes.attr("transform", function (d) {
         d.updated = true;
         d.x -= parentNode.x;
         d.y -= parentNode.y;
         return "translate(" + parentNode.x + "," + parentNode.y + ")";
         });
         }*/
        node.transition().ease("linear")
            .duration(600).attr("transform", function (d) {
                var x = d.x;
                var y = d.y;
                /*if(d.updated){
                 d.x += parentNode.x;
                 d.y += parentNode.y;
                 delete d.updated;
                 }*/
                return "translate(" + x + "," + y + ")";
            });
    };

    var renderEdge = function (skipAnimation) {
        var tempLinkObj = link;
        //Appending edges to the layout.
        if(!skipAnimation){
            tempLinkObj = link.transition().ease("linear")
                .duration(600);
        }
        tempLinkObj.attr("d", function (d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = 0;
                if (edgeType === "CURVE") {
                    dr = Math.sqrt(dx * dx + dy * dy);
                }
                return "M" +
                    d.source.x + "," +
                    d.source.y + "A" +
                    dr + "," + dr + " 0 0,1 " +
                    d.target.x + "," +
                    d.target.y;
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
            newNodes = node;
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
        node.on('contextmenu', function (d, i) {
            d3.event.preventDefault();
            showContextMenu(d);
        }).on('mouseover', tip.show) //Added
            .on('mouseout', tip.hide) //Added
            .on('click', highlightConnectedNodes)
            .on( "mousedown", function() {
                draggingEnabled = true;
            });
    };

    var enableHighlighting = function () {
        //Toggle stores whether the highlighting is on
        var toggle = 0;
        //Create an array logging what is connected to what
        var linkedByIndex = {};
        for (var i = 0; i < graph.nodes.length; i++) {
            linkedByIndex[i + "," + i] = 1;
        }
        graph.links.forEach(function (d) {
            linkedByIndex[d.source.index + "," + d.target.index] = 1;
        });
        //thisRef function looks up whether a pair are neighbours
        function neighboring(a, b) {
            return linkedByIndex[a.index + "," + b.index];
        }

        function connectedNodes(nodeObj) {
            if (toggle == 0) {
                //Reduce the opacity of all but the neighbouring nodes
                d = d3.select(this).node().__data__;
                if (!d) {
                    d = nodeObj;
                }
                node.style("opacity", function (o) {
                    return neighboring(d, o) | neighboring(o, d) ? 1 : 0.2;
                });
                link.style("opacity", function (o) {
                    return d.index == o.source.index | d.index == o.target.index ? 1 : 0.01;
                });
                //Reduce the op
                toggle = 1;
                isNodeHighlighted = true;
            } else {
                //Put them back to opacity=1
                node.style("opacity", 1);
                link.style("opacity", 1);
                toggle = 0;
                isNodeHighlighted = false;
            }
        }

        return connectedNodes;
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
    var zoom = null;
    function enableZooming(){
        zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 3])
            //.translateExtent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        function zoomed() {
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }

        $("#ResetButton").on("click", reset);
        function reset() {
            svg.attr("transform", "translate(0,0)scale(1)");
            zoom.translate([0, 0]).scale(1);
        }
    }

    var appendSVG = function () {
        //Add svg to the body.
        svgParent = d3.select('#' + containerId)
            .append('svg');
        svg = svgParent
            .attr('width', width)
            .attr('height', height)
            .append("g")
            .call(zoom);
    };

    var initializeLayout = function () {
        enableZooming();
        appendSVG();
        enableArrowHeads();
        enableToolTip();
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
                return (edgeType === "CURVE") ? -2 : 0;
            })
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .style("stroke", edgeColor).style("fill", edgeColor);
    };
    var showContextMenu = function (nodeObj) {
        $.contextMenu('destroy');
        var actionItems = {
            showInComingNodes: {
                name: "Connected Nodes...",
                callback: function () {
                    d3.json("./json/" + nodeObj.name + ".json", function (error, graphJson) {
                        if (!error) {
                            graphUtilityObj.updateNodesMap(graphJson, nodeObj.name);
                            thisRef.update(nodeObj);
                        }
                    });
                }
            }
        };
        if (isNodeHighlighted) {
            actionItems.highLightNode = {
                name: "Remove Highlighting...",
                callback: function () {
                    highlightConnectedNodes(nodeObj);
                }
            }
        } else {
            actionItems.highLightNode = {
                name: "Apply Highlighting...",
                callback: function () {
                    highlightConnectedNodes(nodeObj);
                }
            }
        }
        actionItems.createCab = {
            name: "Generate CAB...",
            callback: function () {
                var selectedNodeIds = Object.keys(selectedNodes);
                if(selectedNodeIds.length === 0){
                    alert(nodeObj.name);
                }else{
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
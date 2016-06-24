function ForceLayout() {
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

    thisRef.init = function (tGraph, tWidth, tHeight) {
        graph = tGraph;
        width = tWidth;
        height = tHeight;
        initializeLayout();
        thisRef.drawEdge();
        thisRef.drawNode();
        highlightConnectedNodes = enableHighlighting();
    };

    thisRef.drawEdge = function () {
        //Describing properties of the edges.
        link = svg.append("g").selectAll("path")
            .data(graph.links)
            .enter().append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)");
        renderEdge();
    };

    var renderEdge = function () {
        //Appending edges to the layout.
        link.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = 0;//Math.sqrt(dx * dx + dy * dy);
            return "M" +
                d.source.x + "," +
                d.source.y + "A" +
                dr + "," + dr + " 0 0,1 " +
                d.target.x + "," +
                d.target.y;
        });
    };

    thisRef.drawNode = function () {
        //Describing properties of the nodes.
        node = svg.selectAll('.node')
            .data(graph.nodes).enter()
            .append("g")
            .attr("class", "node");

        //Adding circle to the g tag of the node.
        node.append("circle").attr('r', nodeRadius)
            .style("fill", function (d) {
                return color(d.level);
            });
        renderNode();
        attachLabelToNode();
        attachEventsToNode();
    };

    thisRef.update = function () {
        link = link.data(graph.links, function (d) {
            return d.source.name + "-" + d.target.name;
        });
        link.enter().append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)");

        node = node.data(graph.nodes, function (d) {
            return d.name;
        });
        node.enter().append("g").attr("class", "node").append("circle").attr('r', 20)
            .style("fill", function (d) {
                return color(d.level);
            });
        attachLabelToNode();
        highlightConnectedNodes = enableHighlighting();
        attachEventsToNode();
        renderNode();
        renderEdge();
    };

    var renderNode = function () {
        node.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    };

    var attachLabelToNode = function () {
        //Adding label to the node.
        node.append("text")
            .attr("dx", 25)
            .attr("dy", ".35em")
            .text(function (d) {
                return d.name;
            })
            .style("stroke", "black");
    };

    var attachEventsToNode = function () {
        //Adding events to the node.
        node.on('contextmenu', function (d, i) {
            d3.event.preventDefault();
            showContextMenu(d);
        }).on('mouseover', tip.show) //Added
            .on('mouseout', tip.hide) //Added
            .on('click', highlightConnectedNodes);
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

    var appendSVG = function () {
        //Add svg to the body.
        svg = d3.select('body')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
    };

    var initializeLayout = function () {
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
            .attr("refX", 32)
            .attr("refY", -2)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5");
    };

    var showContextMenu = function (nodeObj) {
        $.contextMenu('destroy');
        var actionItems = {
            showInComingNodes: {
                name: "Show all direct nodes",
                callback: function () {
                    d3.json("./json/"+nodeObj.name+".json", function (error, graphJson) {
                        if(!error){
                            graphUtilityObj.updateNodesMap(graphJson, nodeObj.name);
                            thisRef.update();
                        }
                    });
                }
            }
        };
        if(isNodeHighlighted){
            actionItems.highLightNode = {
                name: "Remove highlighting",
                callback: function () {
                    highlightConnectedNodes(nodeObj);
                }
            }
        }else{
            actionItems.highLightNode = {
                name: "Highlight node",
                callback: function () {
                    highlightConnectedNodes(nodeObj);
                }
            }
        }
        $.contextMenu({
            selector: 'g.node',
            items: actionItems
        });
    };
}
function NodeUtility() {
    var self = this;
    var radius = 10;
    var labelDirection = "RIGHT";
    //Providing support for dynamic generation of colors.
    var color = d3.scale.category20();

    self.init = function (configObj) {
        radius = parseInt(configObj.radius);
        labelDirection = configObj.label.direction;
    };

    self.renderNode = function (nodes, currentNodObj) {
        //Describing properties of the nodes.
        var newNodes = nodes.enter()
            .append("g")
            .attr("class", "node");
        //Adding circle to the g tag of the node.
        newNodes.append("circle").attr({
            'r': radius + 4,
            class: 'outer'});
        newNodes.append("circle").attr('r', radius)
            .style("fill", function (d) {
                return color(d.level);
            });
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
        }).transition().ease("linear").duration(600).attr("transform", function (d) {
            d.rendered = true;
            var x = d.x;
            var y = d.y;
            return "translate(" + [x, y] + ")";
        });
        self.attachLabelToNode(newNodes, nodes);

        nodes.exit().transition()
            .duration(600)
            .attr("transform", function () {
                return "translate(" + currentNodObj.x + "," + currentNodObj.y + ")";
            }).remove();
    };

    self.attachLabelToNode = function (newNodes, nodes) {
        var dx = radius + 5;
        var dy = ".35em";
        if (labelDirection === "CENTER" || labelDirection === "TOP" || labelDirection === "BOTTOM") {
            dx = -radius / 2 - 5;
            if (labelDirection === "TOP") {
                dx = -radius;
                dy = -radius / 2 - 10;
            } else if (labelDirection === "BOTTOM") {
                dx = -radius;
                dy = radius + 10;
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
}
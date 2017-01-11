function EdgeUtility() {
    var self = this;
    var type = "CURVE";
    var color = "#999999";

    self.init = function (configObj) {
        type = configObj.type;
        color = configObj.color;
    };

    self.enableArrowHeads = function (svg, nodeRadius) {
        //Providing support for creating arrow heads to the path.
        svg.append("defs").selectAll("marker")
            .data(["end"])               // Different link/path types can be defined here
            .enter().append("marker")    // This section adds in the arrows
            .attr("id", function (d) {
                return d;
            })
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", function () {
                return 10 + 1.1 * nodeRadius;
            })
            .attr("refY", function () {
                return (type === "CURVE") ? -0.5 : 0;
            })
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .style("stroke", color).style("fill", color);
    };

    self.renderEdge = function (tempLinkObj, currentNodObj) {
        //Describing properties of the edges.
        tempLinkObj.enter().append("path")
            .attr("class", "link")
            .attr("marker-end", "url(#end)");

        //Appending edges to the layout.
        tempLinkObj.style("stroke", function (d) {
            var dx = d.target.x - d.source.x;
            if (dx === 0) {
                return color;//"red"
            }
            return color;
        });

        tempLinkObj.attr("d", function (d) {
            return generatePath(d, currentNodObj);
        }).transition().ease("linear").duration(600).attr("d", function (d) {
            return generatePath(d);
        });

        tempLinkObj.exit().transition().duration(600).attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                point = 0;
            var pathStr = "M" +
                currentNodObj.x + "," + currentNodObj.y;
            if (type === "CURVE") {
                if (dx === 0) {
                    point = currentNodObj.x - 90;
                } else {
                    point = currentNodObj.x + 90;
                }
                pathStr += "C" + point + "," +
                    currentNodObj.y + " " + point + "," +
                    currentNodObj.y + " ";
            } else {
                pathStr += "A0,0 0 0,1 ";
            }
            pathStr += currentNodObj.x + "," + currentNodObj.y;
            return pathStr;
        }).remove();
    };

    var generatePath = function (d, currentNodObj) {
        var dx = d.target.x - d.source.x,
            point = 0;
        var source = d.source,
            target = d.target;
        if (!d.rendered && currentNodObj) {
            source = currentNodObj;
            target = currentNodObj;
        } else {
            d.rendered = true;
        }
        var pathStr = "M" +
            source.x + "," + source.y;
        if (type === "CURVE") {
            if (dx === 0) {
                point = d.source.x - 90;
            } else {
                point = d.source.x + 90;
            }
            pathStr += "C" + point + "," +
                source.y + " " + point + "," +
                target.y + " ";
        } else {
            pathStr += "A0,0 0 0,1 ";
        }
        pathStr += target.x + "," + target.y;
        return pathStr;
    };
}
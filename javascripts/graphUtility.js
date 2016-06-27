function generateGraphData(height, width, x0, y0, paneCount) {
    var thisRef = this;
    thisRef.nodesMap = [];
    thisRef.linksMap = [];
    thisRef.paneNodesCount = [];
    thisRef.nodes = [];
    thisRef.links = [];
    var nodeCount = 0;
    var maxColumns = 3;
    var minSpacing = 50;
    //Change rootNodeId to root and comment first line of the function for complete tree layout.
    thisRef.updateNodesMap = function (graphJson, rootNodeId, direction, parentIndex) {
        var root = graphJson[rootNodeId];
        var currentIndex;
        if (typeof thisRef.nodesMap[root.name] === "undefined") {
            var newIndex = nodeCount;
            thisRef.nodesMap[root.name] = {
                name: root.name,
                index: newIndex,
                fixed: true,
                level: root.depth
            };
            nodeCount++;
            if (typeof thisRef.paneNodesCount[root.depth] === "undefined") {
                thisRef.paneNodesCount[root.depth] = [];
            }
            thisRef.paneNodesCount[root.depth].push(root.name);
        }
        currentIndex = thisRef.nodesMap[root.name].index;
        if (root.incoming) {
            var childLength = root.incoming.length;
            for (var i = 0; i < childLength; i++) {
                thisRef.updateNodesMap(graphJson, root.incoming[i], -1, currentIndex);
            }
        }
        if (root.outgoing) {
            var childLength = root.outgoing.length;
            for (var i = 0; i < childLength; i++) {
                thisRef.updateNodesMap(graphJson, root.outgoing[i], 1, currentIndex);
            }
        }
        if (typeof parentIndex !== "undefined") {
            var key = "";
            if (direction !== -1) {
                key = parentIndex + "_" + currentIndex;
                if (!thisRef.linksMap[key]) {
                    thisRef.linksMap[key] = {source: parentIndex, target: currentIndex};
                }
            } else {
                key = currentIndex + "_" + parentIndex;
                if (!thisRef.linksMap[key]) {
                    thisRef.linksMap[key] = {source: currentIndex, target: parentIndex};
                }
            }
        } else {
            updateNodesAndLinksArr();
            return {
                nodes: thisRef.nodes,
                links: thisRef.links
            };
        }
    };
    var getMaxNodesPossibleInColumn = function () {
        //how many nodes required to occupy viewable area. 9
    };
    var updateNodesAndLinksArr = function () {
        var maxNodesPossibleInColumn = getMaxNodesPossibleInColumn();
        var paneWidth = width / paneCount;
        var paneHeight = height;
        for (var j = 0; j < paneCount; j++) {
            if (thisRef.paneNodesCount[j]) {
                var childrenInCurrentPane = thisRef.paneNodesCount[j].length;
                if (childrenInCurrentPane > maxNodesPossibleInColumn) {
                    //Balance zig zag logic
                    /*
                     3. how many rows required to render the given graph
                     number of row req = number of noes / 9;
                     if(number of row req > = 3){
                     3;
                     }else{
                     number of row req = number of nodes > 9 * number of row req? number of row req  + 1: number of row req ;
                     }
                     number of nodes rendered per row = number of nodes/ number of row req;
                     4. if(number of nodes rendered per row > 9){
                     draw according to the logic distance + radius from top;
                     }else{
                     old logic of dividing the area into parts;
                     }*/
                } else {
                    //Normal logic
                }
                var subPaneHeight = paneHeight / childrenInCurrentPane;
                var x_currentPaneCenter = x0 + (2 * j + 1) * paneWidth / 2;
                for (var k = 0; k < childrenInCurrentPane; k++) {
                    var childKey = thisRef.paneNodesCount[j][k];
                    var nodeObj = thisRef.nodesMap[childKey];
                    nodeObj.x = x_currentPaneCenter;
                    nodeObj.y = y0 + (2 * k + 1) * subPaneHeight / 2;
                    if (!thisRef.nodes[nodeObj.index]) {
                        thisRef.nodes[nodeObj.index] = nodeObj;
                    }
                }
            }
        }
        var linksKeyArr = Object.keys(thisRef.linksMap);
        var linksCount = linksKeyArr.length;
        for (j = thisRef.links.length; j < linksCount; j++) {
            var linkObj = thisRef.linksMap[linksKeyArr[j]];
            thisRef.links[j] = {
                source: thisRef.nodes[linkObj.source],
                target: thisRef.nodes[linkObj.target]
            };
        }
    };
}
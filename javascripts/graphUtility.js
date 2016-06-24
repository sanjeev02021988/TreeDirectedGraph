function generateGraphData(height, width, x0, y0, paneCount) {
    var thisRef = this;
    thisRef.nodesMap = [];
    thisRef.linksMap = [];
    thisRef.paneNodesCount = [];
    thisRef.nodes = [];
    thisRef.links = [];
    var nodeCount = 0;
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
    var updateNodesAndLinksArr = function () {
        var paneWidth = width / paneCount;
        var paneHeight = height;
        for (var j = 0; j < paneCount; j++) {
            if (thisRef.paneNodesCount[j]) {
                var numberOfChildsInCurrentPane = thisRef.paneNodesCount[j].length;
                var subPaneHeight = paneHeight / numberOfChildsInCurrentPane;
                var x_currentPaneCenter = x0 + (2 * j + 1) * paneWidth / 2;
                for (var k = 0; k < numberOfChildsInCurrentPane; k++) {
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
        var prevLinkCount = thisRef.links.length;
        if (prevLinkCount === 0) {
            j = 0;
        } else {
            j = prevLinkCount;
        }
        for (; j < linksCount; j++) {
            var linkObj = thisRef.linksMap[linksKeyArr[j]];
            /*if (prevLinkCount === 0) {
                thisRef.links[j] = linkObj;
            } else {*/
                thisRef.links[j] = {
                    source: thisRef.nodes[linkObj.source],
                    target: thisRef.nodes[linkObj.target]
                };
            //}
        }
    };
}
function generateGraphData(height, width, x0, y0, paneCount) {
    var thisRef = this;
    thisRef.nodesMap = [];
    thisRef.linksMap = [];
    thisRef.paneNodesCount = [];
    thisRef.nodes = [];
    thisRef.links = [];
    var maxColumns = 1;
    var minSpacing = 25;
    var heightUsedOfSvg = 0;
    //Change rootNodeId to root and comment first line of the function for complete tree layout.
    thisRef.updateNodesMap = function (graphJson, nodeId, direction, parentNodeId) {
        var root = graphJson[nodeId];
        if (typeof thisRef.nodesMap[nodeId] === "undefined") {
            thisRef.nodesMap[nodeId] = {
                name: root.name,
                id: nodeId,
                level: root.depth,
                isNew: true
            };
            if (typeof thisRef.paneNodesCount[root.depth] === "undefined") {
                thisRef.paneNodesCount[root.depth] = [];
            }
            thisRef.paneNodesCount[root.depth].push(nodeId);
        }
        if (root.incoming) {
            var childLength = root.incoming.length;
            for (var i = 0; i < childLength; i++) {
                thisRef.updateNodesMap(graphJson, root.incoming[i], -1, nodeId);
            }
        }
        if (root.outgoing) {
            var childLength = root.outgoing.length;
            for (var i = 0; i < childLength; i++) {
                thisRef.updateNodesMap(graphJson, root.outgoing[i], 1, nodeId);
            }
        }
        if (typeof parentNodeId !== "undefined") {
            var key = "";
            if (direction !== -1) {
                key = parentNodeId + "_" + nodeId;
                if (!thisRef.linksMap[key]) {
                    thisRef.linksMap[key] = {source: parentNodeId, target: nodeId};
                }
            } else {
                key = nodeId + "_" + parentNodeId;
                if (!thisRef.linksMap[key]) {
                    thisRef.linksMap[key] = {source: nodeId, target: parentNodeId};
                }
            }
        } else {
            thisRef.updateNodesAndLinksArr(minSpacing, maxColumns);
            return {
                nodes: thisRef.nodes,
                links: thisRef.links
            };
        }
    };
    var getMaxNodesPossibleInColumn = function () {
        //how many nodes required to occupy viewable area.
        return height / minSpacing;
    };

    thisRef.getHeightUsedOfSvg = function(){
        return heightUsedOfSvg;
    };

    var updateNodesPositionVerticalPanesWise = function (paneWidth, paneHeight, childrenInCurrentPane, paneIndex, numberOfColsRequired, numberOfNodesRenderPerColumn, isNodeCountExceeded) {
        var isOddColsReq = true;
        if (!numberOfColsRequired) {
            numberOfColsRequired = 1;
            numberOfNodesRenderPerColumn = childrenInCurrentPane;
        }
        isOddColsReq = numberOfColsRequired % 2;
        for (var colIndex = 0; colIndex < numberOfColsRequired; colIndex++) {
            var numberOfNodesRenderInCurrentColumn = numberOfNodesRenderPerColumn;
            if (colIndex === numberOfColsRequired - 1) {
                numberOfNodesRenderInCurrentColumn = childrenInCurrentPane - colIndex * numberOfNodesRenderPerColumn;
            }
            if (!isNodeCountExceeded) {
                var subPaneHeight = paneHeight / numberOfNodesRenderInCurrentColumn;
            }
            var x_currentPaneCenter = x0 + (2 * paneIndex + 1) * paneWidth / 2;
            if (isOddColsReq) {
                x_currentPaneCenter += (colIndex - parseInt(numberOfColsRequired / 2)) * minSpacing;
            } else {
                if (colIndex < numberOfColsRequired / 2) {
                    x_currentPaneCenter -= ((numberOfColsRequired - 1 - 2 * colIndex) * minSpacing) / 2;
                } else {
                    x_currentPaneCenter += ((2 * colIndex + 1 - numberOfColsRequired) * minSpacing) / 2;
                }
            }
            var nodeObj = null;
            for (var k = 0; k < numberOfNodesRenderInCurrentColumn; k++) {
                var childKey = thisRef.paneNodesCount[paneIndex][colIndex * numberOfNodesRenderPerColumn + k];
                nodeObj = thisRef.nodesMap[childKey];
                nodeObj.x = x_currentPaneCenter;
                if (isNodeCountExceeded) {
                    nodeObj.y = y0 + (2 * k + 1) * (minSpacing) / 2;
                } else {
                    nodeObj.y = y0 + (2 * k + 1) * subPaneHeight / 2;
                }
                if (colIndex % 2) {
                    nodeObj.y += minSpacing / 2;
                }
                if (nodeObj.isNew) {
                    thisRef.nodes.push(nodeObj);
                    delete nodeObj.isNew;
                }
            }
            if(nodeObj.y > heightUsedOfSvg){
                heightUsedOfSvg = nodeObj.y;
            }
        }
    };

    thisRef.updateNodesAndLinksArr = function (tMinSpacing, tMaxColumns) {
        heightUsedOfSvg = 0;
        minSpacing = tMinSpacing;
        maxColumns = tMaxColumns;
        var maxNodesPossibleInColumn = getMaxNodesPossibleInColumn();
        var paneWidth = width / paneCount;
        var paneHeight = height;
        for (var paneIndex = 0; paneIndex < paneCount; paneIndex++) {
            if (thisRef.paneNodesCount[paneIndex]) {
                var childrenInCurrentPane = thisRef.paneNodesCount[paneIndex].length;
                if (childrenInCurrentPane > maxNodesPossibleInColumn) {
                    //Balance zig zag logic
                    var numberOfColsRequired = parseInt(childrenInCurrentPane / maxNodesPossibleInColumn);
                    if (numberOfColsRequired >= maxColumns) {
                        numberOfColsRequired = maxColumns;
                    } else if (childrenInCurrentPane > maxNodesPossibleInColumn * numberOfColsRequired) {
                        numberOfColsRequired++;
                    }
                    var numberOfNodesRenderPerColumn = parseInt(childrenInCurrentPane / numberOfColsRequired);
                    if (childrenInCurrentPane > numberOfNodesRenderPerColumn * numberOfColsRequired) {
                        numberOfNodesRenderPerColumn++;
                    }
                    if (numberOfNodesRenderPerColumn > maxNodesPossibleInColumn) {
                        //draw according to the logic distance + radius from top;
                        updateNodesPositionVerticalPanesWise(paneWidth, paneHeight, childrenInCurrentPane, paneIndex, numberOfColsRequired, numberOfNodesRenderPerColumn, true);
                    } else {
                        updateNodesPositionVerticalPanesWise(paneWidth, paneHeight, childrenInCurrentPane, paneIndex, numberOfColsRequired, numberOfNodesRenderPerColumn);
                    }
                } else {
                    updateNodesPositionVerticalPanesWise(paneWidth, paneHeight, childrenInCurrentPane, paneIndex);
                }
            }
        }
        var linksKeyArr = Object.keys(thisRef.linksMap);
        var linksCount = linksKeyArr.length;
        for (paneIndex = thisRef.links.length; paneIndex < linksCount; paneIndex++) {
            var linkObj = thisRef.linksMap[linksKeyArr[paneIndex]];
            thisRef.links[paneIndex] = {
                source: thisRef.nodesMap[linkObj.source],
                target: thisRef.nodesMap[linkObj.target]
            };
        }
    };
}
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
    thisRef.getHeightUsedOfSvg = function () {
        return heightUsedOfSvg;
    };

    thisRef.getGraphObj = function (graphJson, nodeId) {
        updateNodesAndLinksMaps(graphJson, nodeId);
        thisRef.updateNodesAndLinksArr(minSpacing, maxColumns);
        return {
            nodes: thisRef.nodes,
            links: thisRef.links
        };
    };

    thisRef.deleteNodesAndLinksFromGraphObj = function (nodesToDelete, linksToDelete) {
        var nodeIdArrayFromNodes = thisRef.nodes.map(function (node) {
            return node.id;
        });
        for (var index = 0; index < nodesToDelete.length; index++) {
            var level = thisRef.nodesMap[nodesToDelete[index]].level;
            delete thisRef.nodesMap[nodesToDelete[index]];
            var indexInPaneNodesCount = thisRef.paneNodesCount[level].indexOf(nodesToDelete[index]);
            if (indexInPaneNodesCount !== -1) {
                thisRef.paneNodesCount[level].splice(indexInPaneNodesCount, 1);
            }
            var indexInNodeIdArrayFromNodes = nodeIdArrayFromNodes.indexOf(nodesToDelete[index]);
            if (indexInNodeIdArrayFromNodes !== -1) {
                thisRef.nodes.splice(indexInNodeIdArrayFromNodes, 1);
                nodeIdArrayFromNodes.splice(indexInNodeIdArrayFromNodes, 1);
            }
        }
        var linkIdArrayFromNodes = thisRef.links.map(function (link) {
            return link.source.id + "_" + link.target.id;
        });
        for (index = 0; index < linksToDelete.length; index++) {
            delete thisRef.linksMap[linksToDelete[index]];
            var indexInLinkIdArrayFromNodes = linkIdArrayFromNodes.indexOf(linksToDelete[index]);
            if (indexInLinkIdArrayFromNodes !== -1) {
                thisRef.links.splice(indexInLinkIdArrayFromNodes, 1);
                linkIdArrayFromNodes.splice(indexInLinkIdArrayFromNodes, 1);
            }
        }
        thisRef.updateNodesAndLinksArr(minSpacing, maxColumns);
    };

    thisRef.updateNodesAndLinksArr = function (tMinSpacing, tMaxColumns) {
        heightUsedOfSvg = 0;
        minSpacing = tMinSpacing;
        maxColumns = tMaxColumns;
        updateLinksArr();
        updateNodesArrAndCoordinates();
    };

    var updateNodesAndLinksMaps = function (graphJson, nodeId, direction, parentNodeId) {
        var nodeObj = updateNodesInfo(graphJson, nodeId);

        updateNodesMapForNeighbours(graphJson, nodeObj.incoming, -1, nodeId);
        updateNodesMapForNeighbours(graphJson, nodeObj.outgoing, 1, nodeId);

        updateLinksInfo(parentNodeId, nodeId, direction);
    };

    var updateNodesInfo = function (graphJson, nodeId) {
        var nodeObj = graphJson[nodeId];
        if (typeof thisRef.nodesMap[nodeId] === "undefined") {
            thisRef.nodesMap[nodeId] = {
                name: nodeObj.name,
                id: nodeId,
                level: nodeObj.depth,
                isNew: true
            };
            //Update node count in panes.
            if (typeof thisRef.paneNodesCount[nodeObj.depth] === "undefined") {
                thisRef.paneNodesCount[nodeObj.depth] = [];
            }
            thisRef.paneNodesCount[nodeObj.depth].push(nodeId);
        }
        return nodeObj;
    };

    var updateNodesMapForNeighbours = function (graphJson, nodeList, direction, nodeId) {
        if (nodeList) {
            var childLength = nodeList.length;
            for (var i = 0; i < childLength; i++) {
                updateNodesAndLinksMaps(graphJson, nodeList[i], direction, nodeId);
            }
        }
    };

    var updateLinksInfo = function (parentNodeId, childNodeId, direction) {
        if (typeof parentNodeId !== "undefined") {
            if (direction !== -1) {
                addLinkToMap(parentNodeId, childNodeId);
            } else {
                addLinkToMap(childNodeId, parentNodeId);
            }
        }
    };

    var addLinkToMap = function (sourceId, targetId) {
        var key = sourceId + "_" + targetId;
        if (!thisRef.linksMap[key]) {
            thisRef.linksMap[key] = {source: sourceId, target: targetId};
        }
    };

    var updateLinksArr = function () {
        var linksKeyArr = Object.keys(thisRef.linksMap);
        var linksCount = linksKeyArr.length;
        for (var index = thisRef.links.length; index < linksCount; index++) {
            var linkObj = thisRef.linksMap[linksKeyArr[index]];
            thisRef.links[index] = {
                source: thisRef.nodesMap[linkObj.source],
                target: thisRef.nodesMap[linkObj.target]
            };
        }
    };

    var updateNodesArrAndCoordinates = function () {
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
            if (nodeObj && nodeObj.y > heightUsedOfSvg) {
                heightUsedOfSvg = nodeObj.y;
            }
        }
    };

    var getMaxNodesPossibleInColumn = function () {
        //how many nodes required to occupy viewable area.
        return height / minSpacing;
    };
}
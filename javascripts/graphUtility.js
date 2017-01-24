function GraphUtility(dimObj, configObj) {
    var thisRef = this;
    var height = dimObj.height,
        width = dimObj.width,
        x0 = dimObj.x0,
        y0 = dimObj.y0;
    thisRef.nodesMap = [];
    thisRef.linksMap = [];
    thisRef.paneNodesCount = [];

    thisRef.nodes = [];
    thisRef.links = [];

    var paneCount = configObj.paneCount;
    var minSpacing = configObj.style.node.minSpacing;

    thisRef.currentRootObjYPos = 0;
    thisRef.currentRootObj = null;

    thisRef.updateDimensions = function (tWidth, tHeight) {
        width = tWidth;
        height = tHeight;
    };

    thisRef.getGraphObj = function (graphJson, nodeId) {
        updateNodesAndLinksMaps(graphJson, nodeId);
        updateCurrentRootObjYPos(nodeId);
        thisRef.updateNodesAndLinksArr(minSpacing);
        return {
            nodes: thisRef.nodes,
            links: thisRef.links
        };
    };

    thisRef.updateNodesAndLinksArr = function (tMinSpacing) {
        if (tMinSpacing) {
            minSpacing = parseInt(tMinSpacing);
        }
        updateWidthInNodesMap();
        updateLinksArr();
        updateNodesArrAndCoordinates();
    };

    thisRef.getRenderingCoordinates = function (svg) {
        var nodeObj = thisRef.nodesMap[thisRef.currentRootObj.id];
        var translate = d3.transform(svg.attr("transform")).translate;
        var displacementY = 0;
        if(nodeObj){
            displacementY = thisRef.currentRootObjYPos - nodeObj.y;
        }
        return [x0 + translate[0], y0 + translate[1] + displacementY];
    };

    thisRef.deleteNodesAndLinksFromGraphObj = function (nodeId, nodesToDelete, linksToDelete) {
        deleteNodesFromGraphObj(nodesToDelete);
        deleteLinksFromGraphObj(linksToDelete);
        if(nodeId){
        updateCurrentRootObjYPos(nodeId);
        }
        thisRef.updateNodesAndLinksArr(minSpacing);
    };

    var panesHeightOccupied = 0;
    thisRef.scalingOfSmallMap = function () {
        return ((111 / panesHeightOccupied > 230 / width) ? 230 / width : 111 / panesHeightOccupied);
    };

    var updateCurrentRootObjYPos = function (nodeId) {
        thisRef.currentRootObj = thisRef.nodesMap[nodeId];
        if (typeof thisRef.currentRootObj.y === "undefined") {
            thisRef.currentRootObjYPos = height / 2;
        } else {
            thisRef.currentRootObjYPos = thisRef.currentRootObj.y;
        }
    };

    var deleteLinksFromGraphObj = function (linksToDelete) {
        var linkIdArrayFromNodes = thisRef.links.map(function (link) {
            return link.source.id + "_" + link.target.id;
        });
        for (var index = 0; index < linksToDelete.length; index++) {
            delete thisRef.linksMap[linksToDelete[index]];
            var indexInLinkIdArrayFromNodes = linkIdArrayFromNodes.indexOf(linksToDelete[index]);
            if (indexInLinkIdArrayFromNodes !== -1) {
                thisRef.links.splice(indexInLinkIdArrayFromNodes, 1);
                linkIdArrayFromNodes.splice(indexInLinkIdArrayFromNodes, 1);
            }
        }
    };

    var deleteNodesFromGraphObj = function (nodesToDelete) {
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
    };

    var updateWidthInNodesMap = function () {
        var tempNodesMap = $.extend(true, {}, thisRef.nodesMap);
        for (var paneIndex = 0; paneIndex < paneCount; paneIndex++) {
            var currentPanesNodeList = thisRef.paneNodesCount[paneIndex];
            if (currentPanesNodeList) {
                for (var nodeIndex = 0; nodeIndex < currentPanesNodeList.length; nodeIndex++) {
                    var nodeId = currentPanesNodeList[nodeIndex];
                    var nodeObj = tempNodesMap[nodeId];
                    if (!nodeObj.iterated) {
                        updateWidthForOutgoingNodes(tempNodesMap, nodeObj);
                    }
                }
            }
        }
    };

    var updateWidthForOutgoingNodes = function (tempNodesMap, nodeObj) {
        var nodeList = nodeObj.outgoing;
        var width = 0;
        for (var index = 0; index < nodeList.length; index++) {
            var childObj = tempNodesMap[nodeList[index]];
            if (childObj) {
                if (nodeObj.level < childObj.level && !childObj.iterated) {
                    width += updateWidthForOutgoingNodes(tempNodesMap, childObj);
                }
            }
        }
        if (width === 0) {
            width = minSpacing;
        }
        nodeObj.iterated = true;
        nodeObj.width = width;
        thisRef.nodesMap[nodeObj.id].width = nodeObj.width;
        return nodeObj.width;
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
                "innerText":nodeObj.innerText,
                level: nodeObj.depth,
                isNew: true,
                incoming: [],
                outgoing: []
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
            thisRef.nodesMap[sourceId].outgoing.push(targetId);
            thisRef.nodesMap[targetId].incoming.push(sourceId);
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
        panesHeightOccupied = 0;
        var paneWidth = width / paneCount;
        var tempNodesMap = $.extend(true, {}, thisRef.nodesMap);
        for (var paneIndex = 0; paneIndex < paneCount; paneIndex++) {
            var currentPanesNodeList = thisRef.paneNodesCount[paneIndex];
            if (currentPanesNodeList) {
                for (var nodeIndex = 0; nodeIndex < currentPanesNodeList.length; nodeIndex++) {
                    var nodeId = currentPanesNodeList[nodeIndex];
                    var nodeObj = tempNodesMap[nodeId];
                    if (!nodeObj.iterated) {
                        nodeObj.x = x0 + (2 * nodeObj.level + 1) * paneWidth / 2;
                        nodeObj.y = panesHeightOccupied + nodeObj.width / 2;
                        updateCoordinatesForOutgoingNodes(tempNodesMap, nodeObj, paneWidth, panesHeightOccupied);
                        panesHeightOccupied += nodeObj.width;
                    }
                    var originalNodeObj = thisRef.nodesMap[nodeObj.id];
                    originalNodeObj.x = nodeObj.x;
                    originalNodeObj.y = nodeObj.y;
                    if (originalNodeObj.isNew) {
                        thisRef.nodes.push(originalNodeObj);
                        delete originalNodeObj.isNew;
                    }
                }
            }
        }
    };

    var updateCoordinatesForOutgoingNodes = function (tempNodesMap, nodeObj, paneWidth, y0) {
        var nodeList = nodeObj.outgoing;
        if (nodeList.length !== 0) {
            var tempY = y0;
            for (var index = 0; index < nodeList.length; index++) {
                var childObj = tempNodesMap[nodeList[index]];
                if (childObj) {
                    if (nodeObj.level < childObj.level && !childObj.iterated) {
                        childObj.x = x0 + (2 * childObj.level + 1) * paneWidth / 2;
                        childObj.y = tempY + childObj.width / 2;
                        updateCoordinatesForOutgoingNodes(tempNodesMap, childObj, paneWidth, tempY);
                        tempY += childObj.width;
                    }
                }
            }
        }
        nodeObj.iterated = true;
    };
}
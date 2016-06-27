function generateGraphData(height, width, x0, y0, paneCount) {
    var thisRef = this;
    thisRef.nodesMap = [];
    thisRef.linksMap = [];
    thisRef.paneNodesCount = [];
    thisRef.nodes = [];
    thisRef.links = [];
    var nodeCount = 0;
    var maxColumns = 1;
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
            thisRef.updateNodesAndLinksArr(minSpacing, maxColumns);
            return {
                nodes: thisRef.nodes,
                links: thisRef.links
            };
        }
    };
    var getMaxNodesPossibleInColumn = function () {
        //how many nodes required to occupy viewable area.
        return height/minSpacing;
    };

    var updateNodesPositionVerticalPanesWise = function(paneWidth, paneHeight, childrenInCurrentPane, paneIndex, numberOfColsRequired, numberOfNodesRenderPerColumn, isNodeCountExceeded){
        var isOddColsReq = true;
        if(!numberOfColsRequired){
            numberOfColsRequired = 1;
            numberOfNodesRenderPerColumn = childrenInCurrentPane;
        }
        isOddColsReq = numberOfColsRequired%2;
        for(var colIndex = 0; colIndex < numberOfColsRequired; colIndex++){
            var numberOfNodesRenderInCurrentColumn = numberOfNodesRenderPerColumn;
            if(colIndex === numberOfColsRequired - 1){
                numberOfNodesRenderInCurrentColumn = childrenInCurrentPane - colIndex * numberOfNodesRenderPerColumn;
            }
            if(!isNodeCountExceeded){
                var subPaneHeight = paneHeight / numberOfNodesRenderInCurrentColumn;
            }
            var x_currentPaneCenter = x0 + (2 * paneIndex + 1) * paneWidth / 2;
            if(isOddColsReq){
                x_currentPaneCenter += (colIndex - parseInt(numberOfColsRequired/2))*minSpacing;
            }else{
                if(colIndex < numberOfColsRequired/2){
                    x_currentPaneCenter += ((colIndex - numberOfColsRequired/2)*minSpacing)/2;
                }else{
                    x_currentPaneCenter += ((colIndex + 1 - numberOfColsRequired/2)*minSpacing)/2;
                }
            }
            for (var k = 0; k < numberOfNodesRenderInCurrentColumn; k++) {
                var childKey = thisRef.paneNodesCount[paneIndex][colIndex * numberOfNodesRenderPerColumn + k];
                var nodeObj = thisRef.nodesMap[childKey];
                nodeObj.x = x_currentPaneCenter;
                if(isNodeCountExceeded){
                    nodeObj.y = y0 + (2 * k + 1) * (minSpacing) / 2;
                }else{
                    nodeObj.y = y0 + (2 * k + 1) * subPaneHeight / 2;
                }
                if(colIndex%2){
                    nodeObj.y += minSpacing/2;
                }
                if (!thisRef.nodes[nodeObj.index]) {
                    thisRef.nodes[nodeObj.index] = nodeObj;
                }
            }
        }
    };

    thisRef.updateNodesAndLinksArr = function (tMinSpacing, tMaxColumns) {
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
                    var numberOfColsRequired = parseInt(childrenInCurrentPane/maxNodesPossibleInColumn);
                    if(numberOfColsRequired >= maxColumns){
                        numberOfColsRequired = maxColumns;
                    }else if(childrenInCurrentPane > maxNodesPossibleInColumn * numberOfColsRequired){
                        numberOfColsRequired++;
                    }
                    var numberOfNodesRenderPerColumn = parseInt(childrenInCurrentPane/numberOfColsRequired);
                    if(childrenInCurrentPane > numberOfNodesRenderPerColumn * numberOfColsRequired){
                        numberOfNodesRenderPerColumn++;
                    }
                    if(numberOfNodesRenderPerColumn > maxNodesPossibleInColumn){
                        //draw according to the logic distance + radius from top;
                        updateNodesPositionVerticalPanesWise(paneWidth, paneHeight, childrenInCurrentPane, paneIndex, numberOfColsRequired, numberOfNodesRenderPerColumn, true);
                    }else{
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
                source: thisRef.nodes[linkObj.source],
                target: thisRef.nodes[linkObj.target]
            };
        }
    };
}
angular.module("myApp").service("RelatedItemsService", ["$http", "$q", function ($http, $q) {
    var self = this;

    var config = null;

    self.getConfiguration = function () {
        var deferred = $q.defer();
        if (config) {
            deferred.resolve(config);
        } else {
            var url = "./json/config.json";
            $http.get(url).then(function (response) {
                config = response.data;
                deferred.resolve(config);
            }, function (error) {
                console.error(error);
                deferred.reject(config);
            });
        }
        return deferred.promise;
    };

    self.getNodeData = function (rootNodeId) {
        var url = "./json/" + rootNodeId + ".json";
        return $http.get(url);
    };

    self.getDummyConnectedNodes = function (rootNode, graphUtilityObj) {
        var graphJson = {};
        graphJson[rootNode.id] = {
            "name": rootNode.name,
            "depth": rootNode.level,
            "incoming": [],
            "outgoing": []
        };
        var entityNamePrefix = ["RF", "DS", "DRD", "Cube", "WB", "DB"];
        var entityNameInnerText = ["F", "D", "R", "C", "WS", "DB"];
        var childDepth = rootNode.level + 1;
        var startIndex = 0, i, id;
        if (entityNamePrefix[childDepth]) {
            if (graphUtilityObj.paneNodesCount[childDepth]) {
                startIndex = graphUtilityObj.paneNodesCount[childDepth].length;
            }
            for (i = startIndex; i < startIndex + 5; i++) {
                id = entityNamePrefix[childDepth] + i;
                graphJson[rootNode.id].outgoing.push(id);
                graphJson[id] = {
                    "name": id,
                    "depth": childDepth,
                    "innerText":entityNameInnerText[childDepth]
                };
            }
        }
        var parentDepth = rootNode.level - 1;
        if (entityNamePrefix[parentDepth]) {
            startIndex = 0;
            if (graphUtilityObj.paneNodesCount[parentDepth]) {
                startIndex = graphUtilityObj.paneNodesCount[parentDepth].length - 1;
            }
            for (i = startIndex; i < startIndex + 2; i++) {
                id = entityNamePrefix[parentDepth] + i;
                graphJson[rootNode.id].incoming.push(id);
                graphJson[id] = {
                    "name": id,
                    "depth": parentDepth,
                    "innerText":entityNameInnerText[parentDepth]
                };
            }
        }
        return graphJson;
    };
}]);

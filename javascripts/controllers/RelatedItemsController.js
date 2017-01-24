angular.module("myApp").controller("RelatedItemsController", ["$scope", "RelatedItemsService", function ($scope, RelatedItemsService) {
    var self = this;

    self.showConfigDialog = false;
    self.config = {};
    RelatedItemsService.getConfiguration().then(function (response) {
        $.extend(self.config, response);
        self.getNodeData();
    });
    self.config.rootNodeId = "DRD1";
    self.config.data = null;

    self.getNodeData = function () {
        var rootNodeId = self.config.rootNodeId;
        RelatedItemsService.getNodeData(rootNodeId).then(function (response) {
            var graphJson = response.data;
            /*for (var i = 6; i < 20; i++) {
                 var id = "Cube" + i;
                 graphJson[rootNodeId].outgoing.push(id);
                 graphJson[id] = {
                     "name": id,
                     "depth": 3
                 };
             }*/
            self.config.data = graphJson;
            $scope.$broadcast("toggleGraphData");
        });
    };

    self.fnShowConfigDialog = function () {
        self.showConfigDialog = true;
    };

    self.fnHideConfigDialog = function () {
        self.showConfigDialog = false;
    };

    self.fnSaveConfigDialog = function () {
        $scope.$broadcast("reRender");
        self.fnHideConfigDialog();
    };
    self.config.callbacks = {};

    self.config.callbacks.onNodeClick = function (nodeObj, layoutObj) {
        layoutObj.highlightConnectedNodes(nodeObj);
    };

    self.config.callbacks.onNodeDblClick = function (nodeObj, layoutObj) {
        var graphJson = RelatedItemsService.getDummyConnectedNodes(nodeObj, layoutObj.getGraphUtilityObj());
        $scope.$broadcast("updateGraph", {graphJson: graphJson, nodeObj: nodeObj});
    };

    self.config.callbacks.onNodeRightClick = function (nodeObj, layoutObj) {
        $.contextMenu('destroy');
        var actionItems = {
            showInComingNodes: {
                name: "Connected Nodes...",
                callback: function () {
                    var graphJson = RelatedItemsService.getDummyConnectedNodes(nodeObj, layoutObj.getGraphUtilityObj());
                    $scope.$broadcast("updateGraph", {graphJson: graphJson, nodeObj: nodeObj});
                }
            }
        };
        if (layoutObj.isNodesHighlighted()) {
            actionItems.highLightNode = {
                name: "Remove Highlighting...",
                callback: function () {
                    layoutObj.highlightConnectedNodes(nodeObj);
                }
            };
        } else {
            actionItems.highLightParent = {
                name: "Highlight Parent...",
                callback: function () {
                    layoutObj.highlightConnectedNodes(nodeObj, false);
                }
            };
            actionItems.highLightChildren = {
                name: "Highlight Children...",
                callback: function () {
                    layoutObj.highlightConnectedNodes(nodeObj, true);
                }
            };
        }
        actionItems.collapseChilds = {
            name: "Collapse Children...",
            callback: function () {
                nodeObj.outgoing = [];
                nodeObj.width = 25;
                layoutObj.deleteChildren(nodeObj.name);
            }
        };
        actionItems.collapseParents = {
            name: "Collapse Parents...",
            callback: function () {
                nodeObj.incoming = [];
                layoutObj.deleteParent(nodeObj.name);
            }
        };
        actionItems.keepSelf = {
            name: "Keep Self...",
            callback: function () {
                layoutObj.keepLineage(nodeObj, true);
            }
        };
        actionItems.keepLineage = {
            name: "Keep Lineage...",
            callback: function () {
                layoutObj.keepLineage(nodeObj);
            }
        };
        var selectedNodeIds = Object.keys(layoutObj.getSelectedNodes());
        if (selectedNodeIds.length > 1) {
            actionItems = {};
        }
        actionItems.createCab = {
            name: "Generate CAB...",
            callback: function () {
                if (selectedNodeIds.length === 0) {
                    alert(nodeObj.name);
                } else {
                    alert(selectedNodeIds.join());
                }
            }
        };
        actionItems.deleteSelectedNodes = {
            name: "Delete...",
            callback: function () {
                layoutObj.deleteNodes(selectedNodeIds);
            }
        };
        $.contextMenu({
            selector: 'g.node-point',
            items: actionItems
        });
    };
}]);

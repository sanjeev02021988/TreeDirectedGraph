angular.module("myApp").directive("relatedItemsGraph", ["$window", function ($window) {
    return {
        restrict: 'A',
        scope: {
            "config": "="
        },
        templateUrl: './templates/relatedItemsTemplate.html',
        link: function ($scope, $element) {
            var layoutObj = new Layout();

            var element = $($element);
            var containerObj = {
                id: "mainSvgContainer",
                width: element.width(),
                height: element.height(),
                x0: 0,
                y0: 0
            };

            var windowObj = $($window);
            windowObj.bind('keydown', function (event) {
                if (event.ctrlKey) {//event.shiftKey
                    layoutObj.enableSelection(true);
                }
            });

            windowObj.bind('keyup', function (event) {
                if (event.keyCode === 17) {//event.keyCode === 16
                    layoutObj.enableSelection(false);
                }
            });

            windowObj.bind('resize', function (event) {
                var graphUtilityObj = layoutObj.getGraphUtilityObj();
                if (graphUtilityObj) {
                    layoutObj.updateDimensions(element.width(), element.height());
                    layoutObj.reDraw($scope.config.style);
                }
            });

            $scope.$on("toggleGraphData", function () {
                if ($scope.config.data !== null) {
                    layoutObj.init(containerObj, $scope.config);
                    layoutObj.draw();
                }
            });

            $scope.$on("reRender", function () {
                layoutObj.reDraw($scope.config.style);
            });

            $scope.$on("updateGraph", function (event, opt) {
                layoutObj.updateGraph(opt.graphJson, opt.nodeObj);
            });

            $scope.zoomInOut = function (factor) {
                layoutObj.zoomInOut(factor * 0.1);
            };
        }
    };
}]);
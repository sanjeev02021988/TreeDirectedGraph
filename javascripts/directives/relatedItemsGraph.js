angular.module("myApp").directive("relatedItemsGraph", [function () {
    return {
        restrict: 'A',
        scope: {
            "config": "="
        },
        templateUrl: './templates/relatedItemsTemplate.html',
        link: function ($scope) {
            var layoutObj = new Layout();
            $scope.enableSelection = false;

            var renderingAreaConfig = {
              container:{
                  id:"mainSvgContainer",
                  width:1366,//visible height
                  height:643//visible width
              },
              svg:{
                  width:1366,
                  height:6300,
                  x0:0,
                  y0:0
              }
            };
            var mainContainer = renderingAreaConfig.container;
            $("#"+mainContainer.id).css({width: mainContainer.width, height: mainContainer.height});

            $scope.$on("toggleGraphData", function () {
                if ($scope.config.data !== null) {
                    layoutObj.init(mainContainer, renderingAreaConfig.svg, $scope.config);
                    layoutObj.draw();
                }
            });

            $scope.$on("reRender", function () {
                layoutObj.reDraw($scope.config.style);
            });

            $scope.$on("updateGraph",function(event, opt){
                layoutObj.updateGraph(opt.graphJson, opt.nodeObj);
            });

            $scope.fnEnableSelection = function () {
                layoutObj.enableSelection($scope.enableSelection);
            };

            $scope.zoomInOut = function (factor) {
                layoutObj.zoomInOut(factor * 0.1);
            };
        }
    };
}]);
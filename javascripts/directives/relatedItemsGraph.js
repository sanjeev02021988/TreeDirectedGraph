angular.module("myApp").directive("relatedItemsGraph", ["$document",function ($document) {
    return {
        restrict: 'A',
        scope: {
            "config": "="
        },
        templateUrl: './templates/relatedItemsTemplate.html',
        link: function ($scope) {
            var layoutObj = new Layout();

            var renderingAreaConfig = {
              container:{
                  id:"mainSvgContainer",
                  width:1346,//visible height
                  height:640//visible width
              },
              svg:{
                  width:1346,
                  height:6300,
                  x0:0,
                  y0:0
              }
            };
            var mainContainer = renderingAreaConfig.container;
            $("#"+mainContainer.id).css({width: mainContainer.width, height: mainContainer.height});

            $document.bind('keydown', function(event) {
                if(event.ctrlKey){//event.shiftKey
                    layoutObj.enableSelection(true);
                }
            });

            $document.bind('keyup', function(event) {
                if(event.keyCode === 17){//event.keyCode === 16
                    layoutObj.enableSelection(false);
                }
            });

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

            $scope.zoomInOut = function (factor) {
                layoutObj.zoomInOut(factor * 0.1);
            };
        }
    };
}]);
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
}]);

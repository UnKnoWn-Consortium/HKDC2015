var app = angular.module('main', ['ngAnimate', 'ui.bootstrap']);

app.controller('searchCtrl', ['$scope', 'searchSvc', function($scope, searchSvc){
    var self = this;
    this.searchKeyword = "";
    $scope.$watch(function(){
        return self.searchKeyword;
    }, function(newVal){
        searchSvc.setKeyword(newVal);
    })
}]);

app.controller('bodyCtrl', ['$scope', '$filter', '$uibModal', 'searchSvc', 'dataSvc', 'webSocketSvc', function($scope, $filter, $uibModal, searchSvc, dataSvc, webSocketSvc){
    var self = this;
    this.districts = null;
    this.keyword = "";
    this.init = function(){
        webSocketSvc.connect();
        dataSvc.loadData().then(function(data){
            self.districts = {
                "Hong-Kong-Island": $filter('filter')(data, {"region":"Hong-Kong-Island"}),
                "Kowloon": $filter('filter')(data, {"region":"Kowloon"}),
                "New-Territories": $filter('filter')(data, {"region":"New-Territories"})
             };
         });
    };
    this.regionNameRefactor  = function(name){
        return name.replace(/-/g, " ");
    };
    this.sorter = function(dist){
        var i = 0;
        while(!dist.seats[i].cacode) i++;
        return dist.seats[i].cacode.charCodeAt(0);
    };
    this.districtClick = function(key, dist){
        var modalInstance = $uibModal.open({
            templateUrl: 'template/info-modal.html',
            controller: 'infoModalCtrl',
            controllerAs: 'ctrl',
            size: 'lg',
            resolve: {
                region: function(){
                    return key;
                },
                district: function(){
                    return dist;
                }
            }
        });
    };
    $scope.$on('webSocketIncomingMsg', function(evt, msg, queue){
        console.log(JSON.parse(msg.data));
    });
    $scope.$watch(function(){
        return searchSvc.getKeyword();
    }, function(newVal){
        self.keyword = newVal;
    })
}]);

app.controller('infoModalCtrl', ['$scope', 'region', 'district', function($scope, region, district){
    this.regionName = region.replace(/-/g, ' ');
    this.district = district;
    this.constituent = null;
    this.sorter = function(constituent){
        if (constituent.type == 'ex-officio'){
            return 99999;
        }else{
            return Number(constituent.cacode.slice(1));
        }
    };
    this.clickConstituent = function(item){
        this.constituent = item;
        console.log(item);
    };
    this.genClass = function(name, nullFlag){
        var obj = {};
        var region = name.replace(/ /g, '-');
        obj[region] = true;
        obj.empty = nullFlag;
        return obj;
    };
    this.progressBarAnimation = function(){
        return {
            "active": !this.constituent.finalized,
            "progress-striped": !this.constituent.finalized
        };
    };
    this.progressBarType = function(candidate){
        if (candidate.win && this.constituent.finalized){
            return "success";
        }else if (!candidate.win && this.constituent.finalized){
            return "danger";
        }else{
            return "info";
        }
    };
    this.progressBarVal = function(candidate){
        if (candidate.win && this.constituent.finalized){
            return this.constituent.electors;
        }else{
            return candidate.vote;
        }
    };
}]);

app.factory("searchSvc", ['$http', function($http){
    var searchKeyword = "";
    return {
        setKeyword: function(val){
            searchKeyword = val;
        },
        getKeyword: function(){
            return searchKeyword;
        }
    }
}]);

app.factory("dataSvc", ['$http', '$q', function($http, $q){
    var data;
    return {
        loadData: function(){
            return $q(function(resolve, reject){
                $http.get('http://www.unknownsys.com:4444/api/districts/json').then(function(res){
                    data = res.data; // save a local copy in the service
                    resolve(data);
                }, function(res){
                    reject(res);
                });
            });
        }
    }
}]);

app.factory("webSocketSvc", ['$rootScope', function($rootScope){
    var stream = [];
    var connection;
    return {
        getStream: function(){
            return stream;
        },
        connect: function(url){
            if (!!url && typeof url == "string"){
                connection = new WebSocket(url);
                connection.onmessage = function(evt){
                    stream.push(evt);
                    $rootScope.$broadcast('webSocketIncomingMsg', evt, stream);
                };
                return connection;
            }else{
                connection = new WebSocket("ws://www.unknownsys.com:9000");
                connection.onmessage = function(evt){
                    stream.push(evt);
                    $rootScope.$broadcast('webSocketIncomingMsg', evt, stream);
                };
                return connection;
            }
        },
        send: function(msg){
            connection.send(msg);
        },
        close: function(){
            connection.close();
        },
        addEvt: function(func){
            if (typeof func == "function"){
                connection.onmessage = function(evt){
                    stream.push(evt.data);
                    func(evt);
                }
            }
        }
    }
}]);
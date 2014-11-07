(function (angular) {
    'use strict';

    angular.module('hang-out', [])
    //.constant('storeUrl', 'http://localhost/HttpDataStore/')
    .constant('storeUrl', 'http://h-httpstore.azurewebsites.net/')
    .constant('storeName', {
        activities: 'h-hang-out-activities'
    });

}).call(this, this.angular);
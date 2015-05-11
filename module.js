(function (angular) {
    'use strict';

    angular.module('hang-out', ['angular-md5'])
    .constant('storeUrl', 'http://localhost/HttpDataStore/')
    //.constant('storeUrl', 'http://h-httpstore.azurewebsites.net/')
    .constant('storeName', {
        activities: 'h-hang-out-activities',
        users: 'h-hang-out-users',
        userProfiles: 'h-hang-out-user-profiles'
    })
    .service('hangOutRealtime', ['$q', function ($q) {
        this.isAvailable = function () {
            return false;
        };
        this.bind = function () {
            return $q.reject('Real-Time API Unavailable');
        };
    }]);

}).call(this, this.angular);
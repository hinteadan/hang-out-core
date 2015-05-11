(function (angular) {
    'use strict';

    angular.module('hang-out', ['angular-md5'])
    .constant('storeUrl', 'http://localhost/HttpDataStore/')
    //.constant('storeUrl', 'http://h-httpstore.azurewebsites.net/')
    .constant('storeName', {
        activities: 'h-hang-out-activities',
        users: 'h-hang-out-users',
        userProfiles: 'h-hang-out-user-profiles'
    });

}).call(this, this.angular);
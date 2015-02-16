(function (angular, $) {
    'use strict';

    angular.module('hang-out', ['angular-md5'])
    .constant('storeUrl', 'http://localhost/HttpDataStore/')
    //.constant('storeUrl', 'http://h-httpstore.azurewebsites.net/')
    .constant('realTimeRootPath', 'realtime')
    .constant('storeName', {
        activities: 'h-hang-out-activities',
        users: 'h-hang-out-users',
        userProfiles: 'h-hang-out-user-profiles'
    })
    .run(['storeUrl', 'realTimeRootPath', function (storeUrl, rootPath) {
        $('body').append('<script src="' + storeUrl + rootPath + '/hubs" type="text/javascript"></script>');
    }]);

}).call(this, this.angular, this.jQuery);
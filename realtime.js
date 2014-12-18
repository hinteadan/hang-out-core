(function (angular, $) {
    'use strict';

    function RealtimeApi(hubServer) {

        var handler = {
            onChange: null,
            onCreate: null,
            onDelete: null
        };

        function setHandler(type, withThis) {
            handler[type] = withThis;
        }

        this.handle = function (type, entity) {
            if (!angular.isFunction(handler[type])) {
                return;
            }
            handler[type].call(null, entity);
        };

        this.announceEntityChange = function (entity) {
            hubServer.announceEntityChange(entity);
        };

        this.announceEntityCreated = function (entity) {
            hubServer.announceEntityCreated(entity);
        };

        this.setOnChangeHandler = function (doThis) {
            setHandler('onChange', doThis);
            return this;
        };
        this.setOnCreateHandler = function (doThis) {
            setHandler('onCreate', doThis);
            return this;
        };
        this.setOnDeleteHandler = function (doThis) {
            setHandler('onDelete', doThis);
            return this;
        };
    }

    angular.module('hang-out')
    .service('hangOutRealtime', ['$timeout', '$q', 'storeUrl', 'realTimeRootPath', function ($t, $q, storeUrl, rootPath) {

        var realtime = null,
            retryCount = 0,
            retryMax = 20,
            retryIn = 500,
            realtimeApi = null,
            deff = $q.defer();


        function areHubsLoaded() {
            return Boolean($.connection.entityHub);
        }

        function initialize() {
            realtimeApi = null;
            realtime = $.connection.entityHub;

            realtime.client.entityChanged = function (e) { realtimeApi.handle('onChange', e); };
            realtime.client.entityCreated = function (e) { realtimeApi.handle('onCreate', e); };
            realtime.client.entityRemoved = function (e) { realtimeApi.handle('onDelete', e); };

            $.connection.hub.url = storeUrl + rootPath;
            $.connection.hub.start().done(function () {
                realtimeApi = new RealtimeApi(realtime.server);
                deff.resolve(realtimeApi);
            });
        }

        function tryInitialize() {
            if (areHubsLoaded()) {
                retryIn = 500;
                initialize();
                return;
            }
            else if (retryCount === retryMax) {
                deff.reject('Real-Time API Unavailable');
                return;
            }
            retryCount++;
            retryIn *= Math.floor(retryCount / 3) || 1;
            $t(tryInitialize, retryIn);
        }
        tryInitialize();

        this.isAvailable = function () {
            return Boolean(realtimeApi);
        };
        this.bind = function () {
            return this.isAvailable() ? $q.when(realtimeApi) : deff.promise;
        };
    }]);


}).call(this, this.angular, this.jQuery);
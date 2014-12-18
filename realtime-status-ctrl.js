(function (angular) {
    'use strict';

    angular.module('hang-out')
    .controller('hangOutRealtimeStatus', ['$scope', 'hangOutRealtime', function ($s, realtime) {

        var status = {
                disconnected: 0,
                connecting: 1,
                connected: 2
            },
            literals = ['disconnected', 'connecting', 'connected'];

        function initialize() {
            $s.state = status.connecting;
            realtime.bind().then(function () {
                $s.state = status.connected;
            }, function () {
                $s.state = status.disconnected;
            });
        }

        $s.status = status;
        $s.state = status.disconnected;
        $s.literalState = function () {
            return literals[$s.state];
        };

        initialize();
    }]);


}).call(this, this.angular);
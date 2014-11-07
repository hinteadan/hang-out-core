(function (angular, _) {
    'use strict';

    function ConstructorInfo(constructor, children, isFactory) {
        /// <param name="constructor" type="function" />
        /// <param name="children" type="Object" elementType="ConstructorInfo" />
        this.constructor = constructor;
        this.children = children;
        this.build = function (dto) {
            return isFactory ? this.constructor(dto) : new this.constructor();
        };
        this.hasChild = function (name) {
            return this.children ? Boolean(this.children[name]) : false;
        };
    }

    angular.module('hang-out').service('model-mapper', ['model', function (m) {

        function constructFromDto(dto, constructorInfo) {
            /// <param name="constructorInfo" type="ConstructorInfo" />
            var model = constructorInfo.build(dto);
            for (var property in dto) {
                if (constructorInfo.hasChild(property)) {
                    model[property] = constructFromDto(dto[property], constructorInfo.children[property]);
                    continue;
                }
                model[property] = dto[property];
            }
            return model;
        }

        this.activity = function (dto) {
            return constructFromDto(dto, new ConstructorInfo(m.Activity, {
                initiator: new ConstructorInfo(m.Individual),
                pendingMembers: new ConstructorInfo(function (dto) {
                    return _.map(dto, function (dude, index) {
                        dto[index] = constructFromDto(dude, new ConstructorInfo(m.Individual));
                    });
                }, null, true),
                confirmedMembers: new ConstructorInfo(function (dto) {
                    return _.map(dto, function (dude, index) {
                        dto[index] = constructFromDto(dude, new ConstructorInfo(m.Individual));
                    });
                }, null, true),
                startsOn: new ConstructorInfo(function (dto) { return new Date(dto).getTime(); }, null, true),
                endsOn: new ConstructorInfo(function (dto) { return dto ? new Date(dto).getTime() : null; }, null, true),
                place: new ConstructorInfo(m.Place, {
                    location: new ConstructorInfo(m.GpsLocation)
                })
            }));
        };

    }]);

}).call(this, this.angular, this._);
(function (angular, ds, _) {
    'use strict';

    angular.module('hang-out')
    .service('dataStore', ['$q', 'storeUrl', 'storeName', 'model-mapper', function ($q, storeUrl, storeName, map) {

        var activityStore = new ds.Store(storeName.activities, storeUrl);

        function as$q(fn) {
            ///<param name="fn" type="Function" />
            return function () {
                var deff = $q.defer();
                fn.apply(null, _.union(arguments, [function (payload) {
                    if (this.isSuccess) {
                        deff.resolve(payload);
                    }
                    else {
                        deff.reject(this.reason);
                    }
                }]));
                return deff.promise;
            };
        }

        function persistUpdatedActivity(id, token, activity, then) {
            var entity = new ds.Entity(activity, activity.meta());
            entity.Id = id;
            entity.CheckTag = token;

            activityStore.Save(entity, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    then.call(result, result.data, result.isSuccess, result.reason);
                }
            });
        }

        function storeActivity(activity, then) {
            var entity = new ds.Entity(activity, activity.meta());
            activityStore.Save(entity, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    then.call(result, result.data, result.isSuccess, result.reason);
                }
            });
        }

        function fetchJoinableActivities(then) {
            var query = new ds.queryWithAnd()
                .where('startsOn')(ds.is.HigherThan)(new Date().getTime())
                .where('isCancelled')(ds.is.EqualTo)(false)
                .where('isWrapped')(ds.is.EqualTo)(false);
            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return {
                            id: entity.Id,
                            token: entity.CheckTag,
                            activity: map.activity(entity.Data),
                            startsOn: entity.Data.startsOn
                        };
                    });
                    then.call(result, activities, result.isSuccess, result.reason);
                }
            });
        }

        function joinActivity(id, token, activity, individual, then) {
            if (activity.hasParticipant(individual)) {
                if (angular.isFunction(then)) {
                    then.call(new ds.OperationResult(false, 'This member is already part of the activity'));
                }
                return;
            }

            activity.joinMember(individual);

            persistUpdatedActivity(id, token, activity, then);

        }

        function fetchActivitiesFor(dude, then) {
            var query = new ds.queryWithAnd().where('initiator')(ds.is.EqualTo)(dude.email);
            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return {
                            id: entity.Id,
                            token: entity.CheckTag,
                            activity: map.activity(entity.Data),
                            startsOn: entity.Data.startsOn
                        };
                    });
                    then.call(result, activities, result.isSuccess, result.reason);
                }
            });
        }

        function fetchActivitiesForParticipant(dude, then) {
            var query = new ds.queryWithAnd().where('participants')(ds.is.Containing)(dude.email);
            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return {
                            id: entity.Id,
                            token: entity.CheckTag,
                            activity: map.activity(entity.Data),
                            startsOn: entity.Data.startsOn
                        };
                    });
                    then.call(result, activities, result.isSuccess, result.reason);
                }
            });
        }

        function confirmParticipantForActivity(id, token, activity, participant, then) {

            if (activity.isParticipantConfirmed(participant)) {
                if (angular.isFunction(then)) {
                    then.call(new ds.OperationResult(false, 'This participant is already confirmed'));
                }
                return;
            }

            activity.confirmMember(participant);

            persistUpdatedActivity(id, token, activity, then);
        }

        function wrapActivity(id, token, activity, then) {

            if (activity.isWrapped) {
                if (angular.isFunction(then)) {
                    then.call(new ds.OperationResult(false, 'This activity is already wrapped'));
                }
                return;
            }

            activity.wrap();

            persistUpdatedActivity(id, token, activity, then);
        }

        function cancelActivity(id, token, activity, reason, then) {

            if (activity.isCancelled) {
                if (angular.isFunction(then)) {
                    then.call(new ds.OperationResult(false, 'This activity is already cancelled'));
                }
                return;
            }

            activity.cancel(reason);

            persistUpdatedActivity(id, token, activity, then);
        }

        function bailOutParticipantFromActivity(id, token, activity, member, reason, then) {
            activity.bailOut(member, reason);
            persistUpdatedActivity(id, token, activity, then);
        }

        this.publishNewActivity = as$q(storeActivity);
        this.activitiesToJoin = as$q(fetchJoinableActivities);
        this.joinActivity = as$q(joinActivity);
        this.activitiesFor = as$q(fetchActivitiesFor);
        this.activitiesAppliedToFor = as$q(fetchActivitiesForParticipant);
        this.confirmParticipant = as$q(confirmParticipantForActivity);
        this.wrapActivity = as$q(wrapActivity);
        this.cancelActivity = as$q(cancelActivity);
        this.bailOut = as$q(bailOutParticipantFromActivity);

    }]);

}).call(this, this.angular, this.H.DataStore, this._);
(function (angular, ds, _) {
    'use strict';

    angular.module('hang-out')
    .service('dataStore', ['$q', 'storeUrl', 'storeName', 'model-mapper', 'hangOutRealtime', function ($q, storeUrl, storeName, map, realtime) {

        var activityStore = new ds.Store(storeName.activities, storeUrl),
            userStore = new ds.Store(storeName.users, storeUrl);

        function tryToBroadcastRealtime(doThis) {
            if (realtime.isAvailable()) {
                realtime.bind().then(function (api) {
                    doThis.call(api, api);
                });
            }
        }

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

        function mapActivityEntry(activityEntity) {
            return {
                id: activityEntity.Id,
                token: activityEntity.CheckTag,
                activity: map.activity(activityEntity.Data),
                startsOn: activityEntity.Data.startsOn
            };
        }

        function persistUpdatedActivity(id, token, activity, then) {
            var entity = new ds.Entity(activity, activity.meta());
            entity.Id = id;
            entity.CheckTag = token;

            activityStore.Save(entity, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                tryToBroadcastRealtime(function (api) { api.announceEntityChange(result.data); });
                if (angular.isFunction(then)) {
                    then.call(result, result.data, result.isSuccess, result.reason);
                }
            });
        }

        function storeActivity(activity, then) {
            activity.maxInstantConfirms = activity.isMemberInstantlyConfirmed ? Number(activity.maxInstantConfirms) : 0;
            var entity = new ds.Entity(activity, activity.meta());
            activityStore.Save(entity, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                tryToBroadcastRealtime(function (api) { api.announceEntityCreated(result.data); });
                if (angular.isFunction(then)) {
                    then.call(result, result.data, result.isSuccess, result.reason);
                }
            });
        }

        function loadActivity(id, then) {
            activityStore.Load(id, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                var activity = mapActivityEntry(result.data);
                if (angular.isFunction(then)) {
                    then.call(result, activity, result.isSuccess, result.reason);
                }
            });
        }

        function fetchJoinableActivities(dude, then) {
            var query = new ds.queryWithAnd()
                .whereNot('initiator')(ds.is.EqualTo)(dude.email)
                .whereNot('participants')(ds.is.Containing)(dude.email)
                .where('startsOn')(ds.is.HigherThan)(new Date().getTime())
                .where('isCancelled')(ds.is.EqualTo)(false)
                .where('isWrapped')(ds.is.EqualTo)(false);

            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return mapActivityEntry(entity);
                    });
                    then.call(result, activities, result.isSuccess, result.reason);
                }
            });
        }

        function fetchPastActivities(then) {
            var query = new ds.queryWithAnd()
                .where('startsOn')(ds.is.LowerThanOrEqualTo)(new Date().getTime())
                .where('isCancelled')(ds.is.EqualTo)(false);

            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return mapActivityEntry(entity);
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
            var query = new ds.queryWithAnd()
                .where('initiator')(ds.is.EqualTo)(dude.email)
                .where('startsOn')(ds.is.HigherThan)(new Date().getTime())
                .where('isCancelled')(ds.is.EqualTo)(false);
            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return mapActivityEntry(entity);
                    });
                    then.call(result, activities, result.isSuccess, result.reason);
                }
            });
        }

        function fetchActivitiesForParticipant(dude, then) {
            var query = new ds.queryWithAnd()
                .where('participants')(ds.is.Containing)(dude.email)
                .where('startsOn')(ds.is.HigherThan)(new Date().getTime())
                .where('isCancelled')(ds.is.EqualTo)(false);
            activityStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var activities = !result.isSuccess ? [] : _.map(result.data, function (entity) {
                        ///<param name="entity" type="ds.Entity" />
                        return mapActivityEntry(entity);
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

        function changeActivityDescription(id, token, activity, newDescription, then) {
            if (!newDescription || activity.description === newDescription) {
                if (angular.isFunction(then)) {
                    then.call(new ds.OperationResult(false, 'The new description is empty or it hasn\'t really changed'), null, false, 'The new description is empty or it hasn\'t really changed');
                }
                return;
            }
            activity.description = newDescription;
            persistUpdatedActivity(id, token, activity, then);
        }

        function fetchUserByEmail(email, then) {
            var query = new ds.queryWithAnd().where('email')(ds.is.EqualTo)(email);
            userStore.Query(query, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    var user = !result.isSuccess || !result.data.length ? null : map.user(result.data[0].Data);
                    then.call(result, user, result.isSuccess, result.reason);
                }
            });
        }

        function queueUserForRegistration(individual, clientId, then) {
            new ds.Validation().QueueForValidation(new ds.Entity(individual, individual.meta()), storeName.users, clientId, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    then.call(result, result.data, result.isSuccess, result.reason);
                }
            });
        }

        function validateRegistration(clientId, token, then) {
            new ds.Validation().Validate(token, clientId, function (result) {
                ///<param name="result" type="ds.OperationResult" />
                if (angular.isFunction(then)) {
                    then.call(result, result.data ? map.user(result.data.Data) : null, result.isSuccess, result.reason);
                }
            });
        }

        this.activity = as$q(loadActivity);
        this.publishNewActivity = as$q(storeActivity);
        this.activitiesToJoin = as$q(fetchJoinableActivities);
        this.pastActivities = as$q(fetchPastActivities);
        this.joinActivity = as$q(joinActivity);
        this.activitiesFor = as$q(fetchActivitiesFor);
        this.activitiesAppliedToFor = as$q(fetchActivitiesForParticipant);
        this.confirmParticipant = as$q(confirmParticipantForActivity);
        this.wrapActivity = as$q(wrapActivity);
        this.cancelActivity = as$q(cancelActivity);
        this.bailOut = as$q(bailOutParticipantFromActivity);
        this.changeDescription = as$q(changeActivityDescription);

        this.userViaEmail = as$q(fetchUserByEmail);
        this.queueRegistration = as$q(queueUserForRegistration);
        this.validateRegistration = as$q(validateRegistration);

    }]);

}).call(this, this.angular, this.H.DataStore, this._);
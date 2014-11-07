(function (angular, moment, _) {
    'use strict';

    var defaultDateFormat = 'D MMM YYYY, HH:mm';

    function parseToMoment(input) {
        var mDate = moment(input);
        if (!mDate.isValid()) {
            mDate = moment(input, moment.ISO_8601);
        }
        return mDate;
    }

    function Individual(name, email, profileUrl) {
        this.name = name || null;
        this.email = email || null;
        this.profileUrl = profileUrl || null;
    }

    function GpsLocation(lat, lng) {
        this.lat = lat || 0;
        this.lng = lng || 0;
    }
    GpsLocation.unknown = new GpsLocation();

    function Place(name, address, details, websiteUrl, location) {
        this.name = name || null;
        this.address = address || null;
        this.details = details || null;
        this.websiteUrl = websiteUrl || null;
        this.location = location || GpsLocation.unknown;
    }
    Place.unknown = new Place();

    function Activity(initiator, title, startsOn, endsOn, place, description) {
        this.initiator = initiator;
        this.pendingMembers = [];
        this.confirmedMembers = [];
        this.title = title || null;
        this.description = description || null;
        this.startsOn = startsOn || new Date().getTime();
        this.startsOnFormatted = function () {
            return !this.startsOn ? '' : parseToMoment(this.startsOn).format(defaultDateFormat);
        };
        this.endsOn = endsOn;
        this.isWrapped = false;
        this.isCancelled = false;
        this.cancellationReason = null;
        this.bailAudit = [];
        this.unWrapAudit = [];
        this.endsOnFormatted = function () {
            return !this.endsOn ? '' : parseToMoment(this.endsOn).format(defaultDateFormat);
        };
        this.place = place || Place.unknown;
        this.friendlyStatus = function () {
            if (this.isCancelled) { return 'Cancelled, quoting: "' + this.cancellationReason + '"'; }
            if (this.isWrapped) { return 'Confirmed'; }
            return 'Still pending';
        };
        this.allParticipants = function () {
            return _.union([this.initiator], this.pendingMembers);
        };
        this.unconfirmedParticipants = function () {
            return _.difference(this.pendingMembers, this.confirmedMembers);
        };
        this.hasParticipant = function (individual) {
            return _.any(this.allParticipants(), function (p) { return p.email === individual.email; });
        };
        this.isParticipantConfirmed = function (member) {
            if (member.email === this.initiator.email) {
                return true;
            }
            return _.any(this.confirmedMembers, function (p) { return p.email === member.email; });
        };
        this.joinMember = function (member) {
            if (this.hasParticipant(member) || this.isWrapped) {
                return;
            }
            this.pendingMembers.push(member);
        };
        this.confirmMember = function (member) {
            if (!this.hasParticipant(member)) {
                throw new Error('This member is not willing to join this activity');
            }
            if (this.isParticipantConfirmed(member)) {
                return;
            }
            this.confirmedMembers.push(_.find(this.pendingMembers, { email: member.email }));
        };
        this.wrap = function () {
            this.isWrapped = true;
        };
        this.unWrap = function (reason) {
            if (!reason) {
                throw new Error('A reason for unwrapping an activity must be provided');
            }
            this.unWrapAudit.push({
                at: new Date().getTime(),
                reason: reason
            });
            this.isWrapped = false;
        };
        this.cancel = function (reason) {
            this.isCancelled = true;
            this.cancellationReason = reason;
        };
        this.bailOut = function (member, reason) {
            if (!this.hasParticipant(member)) {
                return;
            }
            this.bailAudit.push({
                at: new Date().getTime(),
                email: member.email,
                reason: reason
            });
            if (this.isParticipantConfirmed(member) && this.isWrapped) {
                this.unWrap(member.email + ' who was a confirmed participant, bailed out, quoting: "' + reason + '"');
            }
            _.remove(this.pendingMembers, function (m) { return m.email === member.email; });
            _.remove(this.confirmedMembers, function (m) { return m.email === member.email; });
        };
        this.meta = function () {
            return {
                initiator: this.initiator.email,
                participants: _.pluck(this.pendingMembers, 'email').join(','),
                confirmedParticipants: _.pluck(this.confirmedMembers, 'email').join(','),
                title: this.title,
                startsOn: this.startsOn,
                endsOn: this.endsOn,
                isWrapped: this.isWrapped,
                isCancelled: this.isCancelled,
                placeName: this.place.name,
                placeAddress: this.place.address,
                placeLocationLat: this.place.location.lat,
                placeLocationLng: this.place.location.lng
            };
        };
    }

    angular.module('hang-out').value('model', {
        Individual: Individual,
        GpsLocation: GpsLocation,
        Place: Place,
        Activity: Activity
    });

}).call(this, this.angular, this.moment, this._);
(function (angular, moment, _) {
    'use strict';

    var defaultDateFormat = 'D MMM YYYY, HH:mm',
        md5 = angular.injector(['ng', 'angular-md5']).get('md5');

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
        this.avatarImageUrl = null;
        this.is = function (me) {
            return me.email === this.email;
        };
        this.emailHash = function () {
            if (!this.email) {
                return null;
            }
            return md5.createHash(this.email.trim().toLowerCase());
        };
        this.gravatarProfileImageUrl = function (size) {
            return 'http://www.gravatar.com/avatar/' + this.emailHash() + '?s=' + (Number(size) || 80);
        };
        this.friendlyName = function () {
            return this.name ? this.name + '[' + this.email + ']' : this.email;
        };
        this.setAvatar = function (url) {
            this.avatarImageUrl = url;
            return this;
        };
        this.avatar = function (size) {
            return this.avatarImageUrl || this.gravatarProfileImageUrl(size);
        };
    }

    function GpsLocation(lat, lng) {
        this.lat = lat || 0;
        this.lng = lng || 0;
        this.isUnknown = function () {
            return this.lat === 0 && this.lng === 0;
        };
    }
    GpsLocation.unknown = new GpsLocation();

    function Place(name, address, details, websiteUrl, location) {
        this.name = name || null;
        this.address = address || null;
        this.details = details || null;
        this.websiteUrl = websiteUrl || null;
        this.location = location || GpsLocation.unknown;
        this.tags = [];
        this.isUnknown = function () {
            return !this.name && !this.address && !this.details && !this.location.lat;
        };
    }
    Place.unknown = new Place();

    function Activity(initiator, title, startsOn, endsOn, place, description) {
        this.initiator = initiator;
        this.pendingMembers = [];
        this.confirmedMembers = [];
        this.title = title || null;
        this.description = description || null;
        this.imageUrl = null;
        this.logoUrl = null;
        this.startsOn = startsOn;
        this.startsOnFormatted = function () {
            return !this.startsOn ? '' : parseToMoment(this.startsOn).format(defaultDateFormat);
        };
        this.endsOn = endsOn;
        this.isWrapped = false;
        this.isCancelled = false;
        this.isMemberInstantlyConfirmed = false;
        this.maxInstantConfirms = 0;
        this.cancellationReason = null;
        this.bailAudit = [];
        this.unWrapAudit = [];
        this.tags = [];
        this.endsOnFormatted = function () {
            return !this.endsOn ? '' : parseToMoment(this.endsOn).format(defaultDateFormat);
        };
        this.place = place || Place.unknown;
        this.friendlyStatus = function () {
            if (this.isCancelled) { return 'Cancelled, quoting: "' + this.cancellationReason + '"'; }
            if (this.isWrapped) { return 'Confirmed'; }
            return 'Still pending';
        };
        this.friendlyTitle = function () {
            return this.title + ' initiated by ' + this.initiator.friendlyName() + ' starting on ' + this.startsOnFormatted();
        };
        this.isPending = function () {
            return !this.isWrapped && !this.isCancelled;
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
        this.isInitiator = function (dude) {
            return this.initiator.email === dude.email;
        };
        this.isFull = function () {
            if (this.maxInstantConfirms <= 0) {
                return false;
            }
            return this.confirmedMembers.length >= this.maxInstantConfirms;
        };
        this.joinMember = function (member) {
            if (this.hasParticipant(member) || this.isWrapped) {
                return;
            }
            this.pendingMembers.push(member);

            if (this.isMemberInstantlyConfirmed === true && this.confirmedMembers.length < this.maxInstantConfirms) {
                this.confirmMember(member);
            }
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
                isMemberInstantlyConfirmed: this.isMemberInstantlyConfirmed,
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
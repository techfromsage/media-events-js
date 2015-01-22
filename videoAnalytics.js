function VideoAnalytics() {
    this.intervalLength = 10000;
    this.lastKnownTime = 0;
    this.playedFrom = 0;
    this.expectedInterval = this.intervalLength;
    this.forwardSeekTolerence = 300;
    this.backwardsSeekTolerence = -300;
    this.restartingTolerence = 300;
    this.endTime = -1;
}

VideoAnalytics.prototype.setStartTime = function(startTime) {
    if(this.lastKnownTime !== 0 || this.playedFrom !== 0) {
        throw 'Cannot set start time after starting';
    }

    this.lastKnownTime = startTime;
    this.playedFrom = startTime;
}

VideoAnalytics.prototype.tick = function(time) {
    var timeDiff = time - this.lastKnownTime;
    var tickEvents = Array();

    if(this.endTime === this.lastKnownTime && time <= this.restartingTolerence) {
        // restarting the stream
        this.expectedInterval = this.intervalLength;
        this.playedFrom = 0;
    } else if(timeDiff > this.forwardSeekTolerence) {
        // seeked forward 
        tickEvents.push({
            start: this.lastKnownTime,
            end: time,
            name: 'forward',
            type: 'seek'
        });

        if(this.playedFrom !== this.lastKnownTime) {
            tickEvents.push({
                start: this.playedFrom, 
                end: this.lastKnownTime,
                name: 'forward',
                type: 'tick',
                premature: true
            });
        }

        this.expectedInterval = (((time / this.intervalLength) | 0) + 1) * this.intervalLength;
        this.playedFrom = time;
    } else if(timeDiff < this.backwardsSeekTolerence) {
        // seeked backwards
        tickEvents.push({
            start: this.lastKnownTime,
            end: time,
            name: 'backward',
            type: 'seek'
        });

        if(this.playedFrom !== this.lastKnownTime) {
            tickEvents.push({
                start: this.playedFrom, 
                end: this.lastKnownTime,
                name: 'backward',
                type: 'tick',
                premature: true
            });
        }

        this.expectedInterval = (((time / this.intervalLength) | 0) + 1) * this.intervalLength;
        this.playedFrom = time;
    } else if(time >= this.expectedInterval) {
        // general tick over the index bounderies

        tickEvents.push({
            start: this.playedFrom, 
            end: this.expectedInterval, 
            name: 'tick',
            type: 'tick',
            premature: false
        });

        this.playedFrom = this.expectedInterval;
        this.expectedInterval += this.intervalLength;
    }

    this.lastKnownTime = time;
    if(tickEvents.length > 0) {
        return tickEvents;
    }

    return null;
}

VideoAnalytics.prototype.pause = function() {
    var events = Array({
        start: this.playedFrom, 
        end: this.lastKnownTime,
        name: 'pause',
        type: 'tick',
        premature: true
    }, {
        time: this.lastKnownTime,
        type: 'pause',
        name: 'paused'
    });

    this.playedFrom = this.lastKnownTime;
    return events;
}

VideoAnalytics.prototype.end = function(time) {
    this.endTime = time;
    this.lastKnownTime = time;

    return Array({
        start: this.playedFrom, 
        end: time,
        name: 'end',
        type: 'tick',
        premature: true
    });
}

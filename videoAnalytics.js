function VideoAnalytics(videoElement, flushEvent) {
    videoAnalytics = this;

    this.intervalLength = 10000;
    this.lastKnownPlaybackTime = 0;
    this.lastKnownTime = 0;
    this.playedFrom = 0;
    this.expectedInterval = this.intervalLength;
    this.endTime = -1;
    this.hasEnded = true;
    this.hasStarted =false;
 
    videoElement.addEventListener("play", function() {
       if(videoAnalytics.hasEnded === true) {
           videoAnalytics.hasEnded = false;
           videoAnalytics.hasStarted = true;
           if(videoElement.currentTime * 1000 < videoAnalytics.intervalLength) {
               flushEvent(videoAnalytics.play());
           }
       }
    });    

    videoElement.addEventListener("timeupdate", function() {
        if(!videoElement.paused && !videoElement.seeking) {
            flushEvent(videoAnalytics.tick(videoElement.currentTime * 1000));
        }
    });

    videoElement.addEventListener("pause", function() {
        if(videoElement.ended !== true && videoElement.seeking !== true) {
            flushEvent(videoAnalytics.pause());
        }
    });

    videoElement.addEventListener("ended", function() {
        flushEvent(videoAnalytics.end(videoElement.currentTime * 1000));
    });
}

VideoAnalytics.prototype.setStartTime = function(startTime) {
    if(this.lastKnownPlaybackTime !== 0 || this.playedFrom !== 0) {
        throw 'Cannot set start time after starting';
    }

    this.lastKnownPlaybackTime = startTime;
    this.playedFrom = startTime;
}

VideoAnalytics.prototype.play = function() {
    this.lastKnownTime = (new Date).getTime();
    return new Array({type: 'view'});
}

VideoAnalytics.prototype.tick = function(playbackTime) {
    var currentTime = (new Date).getTime();
    var playbackDiff = playbackTime - this.lastKnownPlaybackTime;
    var timeDiff = currentTime - this.lastKnownTime;
    var tickEvents = Array();

    if (playbackDiff > timeDiff) {
        var difference = playbackDiff - timeDiff;
    } else {
        var difference = timeDiff - playbackDiff;
    }

    console.info({ difference : difference });

    if (this.endTime === this.lastKnownPlaybackTime && playbackTime <= this.intervalLength) {
        // restarting the stream
        this.expectedInterval = this.intervalLength;
        this.playedFrom = 0;
    } else if (difference > 50) {
        if (playbackDiff > 0) {
            // seeked forward 
            tickEvents.push({
                start: this.lastKnownPlaybackTime,
                end: playbackTime,
                name: 'forward',
                type: 'seek'
            });
    
            if (this.playedFrom !== this.lastKnownPlaybackTime) {
                tickEvents.push({
                    start: this.playedFrom, 
                    end: this.lastKnownPlaybackTime,
                    index: this.expectedInterval,
                    name: 'forward',
                    type: 'tick',
                    premature: true
                });
            }
    
            this.expectedInterval = (((playbackTime / this.intervalLength) | 0) + 1) * this.intervalLength;
            this.playedFrom = playbackTime;
        } else if (playbackDiff < 0) {
            // seeked backwards
            tickEvents.push({
                start: this.lastKnownPlaybackTime,
                end: playbackTime,
                name: 'backward',
                type: 'seek'
            });
    
            if (this.playedFrom !== this.lastKnownPlaybackTime) {
                tickEvents.push({
                    start: this.playedFrom, 
                    end: this.lastKnownPlaybackTime,
                    index: this.expectedInterval,
                    name: 'backward',
                    type: 'tick',
                    premature: true
                });
            }
    
            this.expectedInterval = (((playbackTime / this.intervalLength) | 0) + 1) * this.intervalLength;
            this.playedFrom = playbackTime;
        }
    } else if (playbackTime >= this.expectedInterval) {
        // general tick over the index bounderies

        tickEvents.push({
            start: this.playedFrom, 
            end: this.expectedInterval, 
            index: this.expectedInterval,
            name: 'tick',
            type: 'tick',
            premature: false
        });

        this.playedFrom = this.expectedInterval;
        this.expectedInterval += this.intervalLength;
    }
 
    this.lastKnownTime = currentTime;
    this.lastKnownPlaybackTime = playbackTime;
    if (tickEvents.length > 0) {
        return tickEvents;
    }

    return null;
}

VideoAnalytics.prototype.pause = function() {
    var events = Array({
        start: this.playedFrom, 
        end: this.lastKnownPlaybackTime,
        index: this.expectedInterval,
        name: 'pause',
        type: 'tick',
        premature: true
    }, {
        time: this.lastKnownPlaybackTime,
        type: 'pause',
        name: 'paused'
    });

    this.playedFrom = this.lastKnownPlaybackTime;
    return events;
}

VideoAnalytics.prototype.end = function(playbackTime) {
    this.endTime = playbackTime;
    this.lastKnownPlaybackTime = playbackTime;

    return Array({
        start: this.playedFrom, 
        end: playbackTime,
        index: playbackTime,
        name: 'end',
        type: 'tick',
        premature: true
    });
}

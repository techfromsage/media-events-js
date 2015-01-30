function MediaAnalytics(mediaElement, flushEventFn) {
    var self = this;

    this.intervalLength = 10000;
    this.lastKnownPlaybackTime = 0;
    this.lastKnownTime = 0;
    this.playedFrom = 0;
    this.expectedInterval = this.intervalLength;
    this.endTime = -1;
    this.hasEnded = true;
    this.hasStarted =false;
    this.flushEventFn = flushEventFn;
 
    mediaElement.addEventListener("play", function() {
       if(self.hasEnded === true) {
           self.hasEnded = false;
           self.hasStarted = true;

           if(mediaElement.currentTime * 1000 < self.intervalLength) {
               self.play();
           }
       }
    });    

    mediaElement.addEventListener("timeupdate", function() {
        if(!mediaElement.paused && !mediaElement.seeking) {
            self.timeupdate(mediaElement.currentTime * 1000);
        }
    });

    mediaElement.addEventListener("pause", function() {
        if(mediaElement.ended !== true && mediaElement.seeking !== true) {
            self.pause();
        }
    });

    mediaElement.addEventListener("ended", function() {
        self.end(mediaElement.currentTime * 1000);
    });
}

MediaAnalytics.prototype.setStartTime = function(startTime) {
    if(this.lastKnownPlaybackTime !== 0 || this.playedFrom !== 0) {
        throw 'Cannot set start time after starting';
    }

    this.lastKnownPlaybackTime = startTime;
    this.playedFrom = startTime;
}

MediaAnalytics.prototype.play = function() {
    this.lastKnownTime = (new Date).getTime();
    return new Array({type: 'view'});
}

MediaAnalytics.prototype.timeupdate = function(playbackTime) {
    var currentTime = (new Date).getTime();
    var playbackDiff = playbackTime - this.lastKnownPlaybackTime;
    var timeDiff = currentTime - this.lastKnownTime;

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
            this.flushEventFn({
                start: this.lastKnownPlaybackTime,
                end: playbackTime,
                desc: 'forward seek',
                type: 'seek',
                difference: difference
            });
    
            if (this.playedFrom !== this.lastKnownPlaybackTime) {
                this.flushEventFn({
                    start: this.playedFrom, 
                    end: this.lastKnownPlaybackTime,
                    index: this.expectedInterval,
                    desc: 'forward seek',
                    type: 'segment',
                    premature: true,
                    difference: difference
                });
            }
    
            this.expectedInterval = (((playbackTime / this.intervalLength) | 0) + 1) * this.intervalLength;
            this.playedFrom = playbackTime;
        } else if (playbackDiff < 0) {
            // seeked backwards
            this.flushEventFn({
                start: this.lastKnownPlaybackTime,
                end: playbackTime,
                desc: 'backward seek',
                type: 'seek',
                difference: difference
            });
    
            if (this.playedFrom !== this.lastKnownPlaybackTime) {
                this.flushEventFn({
                    start: this.playedFrom, 
                    end: this.lastKnownPlaybackTime,
                    index: this.expectedInterval,
                    desc: 'backward seek',
                    type: 'tick',
                    premature: true, 
                    difference: difference
                });
            }
    
            this.expectedInterval = (((playbackTime / this.intervalLength) | 0) + 1) * this.intervalLength;
            this.playedFrom = playbackTime;
        }
    } else if (playbackTime >= this.expectedInterval) {
        // general tick over the index bounderies
        this.flushEventFn({
            start: this.playedFrom, 
            end: this.expectedInterval, 
            index: this.expectedInterval,
            name: 'segment completed',
            type: 'segment',
            premature: false
        });

        this.playedFrom = this.expectedInterval;
        this.expectedInterval += this.intervalLength;
    }
 
    this.lastKnownTime = currentTime;
    this.lastKnownPlaybackTime = playbackTime;
}

MediaAnalytics.prototype.pause = function() {
    this.flushEventFn({
        start: this.playedFrom, 
        end: this.lastKnownPlaybackTime,
        index: this.expectedInterval,
        desc: 'pause',
        type: 'segment',
        premature: true
    });

    this.flushEventFn({
        time: this.lastKnownPlaybackTime,
        desc: 'paused',
        type: 'pause',
    });

    this.playedFrom = this.lastKnownPlaybackTime;
    return events;
}

MediaAnalytics.prototype.end = function(playbackTime) {
    this.endTime = playbackTime;
    this.lastKnownPlaybackTime = playbackTime;

    this.flushEventFn({
        start: this.playedFrom, 
        end: playbackTime,
        index: playbackTime,
        desc: 'stream ended',
        type: 'segment',
        premature: true
    });
}

var MediaEvents = (function () {
    var MediaEvents = function (mediaElement, flushEventFn) {
        var self = this;

        this.intervalLength = 10000;
        this.timeTolerance = 1000;
    
        this.lastKnownPlaybackTime = 0;
        this.lastKnownTime = -1;
        this.playedFrom = 0;
        this.expectedInterval = this.intervalLength;
        this.endTime = -1;
        this.hasEnded = true;
        this.hasStarted = false;
        this.hasLoaded = false;

        this.flushEventFn = flushEventFn;
    
        mediaElement.addEventListener("loadeddata", function () {
            self.hasLoaded = true;
            self.endTime = mediaElement.duration * 1000;
        });
    
        mediaElement.addEventListener("play", function () {
           if (self.hasEnded === true) {
               self.hasEnded = false;
               self.hasStarted = true;
    
               self.play();
               console.info('started: ' + self.lastKnownTime);
           }
        });    
    
        mediaElement.addEventListener("timeupdate", function () {
            if (!mediaElement.paused && !mediaElement.seeking && self.hasLoaded) {
                self.timeupdate(mediaElement.currentTime * 1000);
            }
        });
    
        mediaElement.addEventListener("pause", function () {
            if (mediaElement.ended !== true && mediaElement.seeking !== true) {
                self.pause();
            }
        });
    
        mediaElement.addEventListener("ended", function () {
            self.end(mediaElement.currentTime * 1000);
        });
    }

    MediaEvents.prototype = {
        setStartTime: function (startTime) {
            if (this.lastKnownPlaybackTime !== 0 || this.playedFrom !== 0) {
                throw 'Cannot set start time after starting';
            }
        
            this.lastKnownPlaybackTime = startTime;
            this.playedFrom = startTime;
            this.expectedInterval = (((startTime / this.intervalLength) | 0) + 1) * this.intervalLength;
        },
        play: function () {
            this.lastKnownTime = (new Date).getTime();
            this.flushEventFn({type: 'view'});
        },
        timeupdate: function (playbackTime) {
            var currentTime = (new Date).getTime();
            var playbackDiff = playbackTime - this.lastKnownPlaybackTime;
            var timeDiff = currentTime - this.lastKnownTime;
        
            if (playbackDiff > timeDiff) {
                var difference = playbackDiff - timeDiff;
            } else {
                var difference = timeDiff - playbackDiff;
            }
        
            var hasSeeked = difference > this.timeTolerance;
        
            if (this.endTime === this.lastKnownPlaybackTime && playbackTime <= this.intervalLength) {
                // restarting the stream
                this.expectedInterval = this.intervalLength;
                this.playedFrom = 0;                     
            } else if (hasSeeked && playbackDiff > 0 && playbackTime - this.lastKnownPlaybackTime >= 1000) {
                // seeked forward 
                this.flushEventFn({
                    start: this.lastKnownPlaybackTime,
                    end: playbackTime,
                    desc: 'forward seek amount',
                    type: 'seek',
                    difference: difference
                });
        
                if (this.playedFrom > 0 || this.lastKnownPlaybackTime > 0) {
                    this.flushEventFn({
                        start: this.playedFrom, 
                        end: this.lastKnownPlaybackTime,
                        index: this.expectedInterval - this.intervalLength,
                        desc: 'forward seek',
                        type: 'segment',
                        premature: true,
                        difference: difference
                    });
                }
        
                this.expectedInterval = (((playbackTime / this.intervalLength) | 0) + 1) * this.intervalLength;
                this.playedFrom = playbackTime;
            } else if (hasSeeked && playbackDiff < 0 && this.lastKnownPlaybackTime - playbackTime >= 1000) {
                // seeked backwards
                this.flushEventFn({
                    start: this.lastKnownPlaybackTime,
                    end: playbackTime,
                    desc: 'backward seek amount',
                    type: 'seek',
                    difference: difference
                });
        
                if (this.playedFrom > 0 || this.lastKnownPlaybackTime > 0) {
                    this.flushEventFn({
                        start: this.playedFrom, 
                        end: this.lastKnownPlaybackTime,
                        index: this.expectedInterval - this.intervalLength,
                        desc: 'backward seek',
                        type: 'segment',
                        premature: true, 
                        difference: difference
                    });
                }
        
                this.expectedInterval = (((playbackTime / this.intervalLength) | 0) + 1) * this.intervalLength;
                this.playedFrom = playbackTime;
            } else if (playbackTime >= this.expectedInterval) {
                // segment has been completed
                this.flushEventFn({
                    start: this.playedFrom, 
                    end: this.expectedInterval, 
                    index: this.expectedInterval - this.intervalLength,
                    desc: 'segment completed',
                    type: 'segment',
                    premature: false
                });
        
                this.playedFrom = this.expectedInterval;
                this.expectedInterval += this.intervalLength;
            }
         
            this.lastKnownTime = currentTime;
            this.lastKnownPlaybackTime = playbackTime;
        },
        pause: function () {
            this.flushEventFn({
                start: this.playedFrom, 
                end: this.lastKnownPlaybackTime,
                index: this.expectedInterval - this.intervalLength,
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
        },
        end: function () {
            this.lastKnownPlaybackTime = this.endTime;
        
            this.flushEventFn({
                start: this.playedFrom, 
                end: this.endTime,
                index: this.expectedInterval - this.intervalLength,
                desc: 'stream ended',
                type: 'segment',
                premature: true
            });
        }
    }

    return MediaEvents;
})();

var talis = talis || {};
talis.media = talis.media || {};
talis.media.MediaEvents = MediaEvents;

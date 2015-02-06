MediaEvents wraps around either a video or audio element to provide a consistent set of events.

```
  var media = document.getElementById('video');
  var timeTracker = new talis.media.MediaEvents(media, function(mediaEvent) { 
    console.info(JSON.stringify(mediaEvent));
  });
```

## Terminology
 * segment/index - the video is split into multiple parts (starts at 0). Each part has a length defined by the interval
 * interval - length of a index in milliseconds (currently 10 seconds long)
 * seek - event that is triggered when a user either clicks somewhere on the video timeline or clicks and drags
 * tick - event that describes the amount of time spent within a index (maximum amount is the interval length)

## Events
View Event: `{"type":"view"}`
 * The user started to consume the media

Seeking Event: `{"start":3891.264,"end":9314.182999999999,"desc":"forward","type":"seek"}`
 * Triggered when the user seeks across the timeline
   * start: When the seeking started
   * end: Where the seeking ended

Segment Event: `{"start":0,"end":10000,"desc":"segment completed","type":"segment","premature":false}`
 * A segment of the media has been consumed
   * start: Where the playback started within a index
   * end: Where the playback ended within a index
   * premature: If the tick finished at the end of a index or whether a seek/pause triggered the tick

Premature Segment Event: `{"start":0,"end":10000,"desc":"segment completed","type":"segment","premature":false}`
  * The segment was not totally consumed by the user. This is caused by pauses, seeks or the end of the stream.
  
Pause Event: `{"time":1262.166,"type":"pause","desc":"paused"}`
 * The user paused the media
   * time: When the pause event happened

## Demo & testing
Checkout this code and open testVideo.html or testAudio.html in your browser. If you want to execute the tests open test.html. These tests can be executed on >=IE10, FF, Chrome, Safari (macosx), IOS, Android & Windows Mobile

```
{"start":0,"end":10000,"index":0,"desc":"segment completed","type":"segment","premature":false}
{"start":12485.648,"end":3977.1,"desc":"backward seek amount","type":"seek","difference":8686.547999999999}
{"start":10000,"end":12485.648,"index":10000,"desc":"backward seek","type":"segment","premature":true,"difference":8686.547999999999}
{"start":5289.361000000001,"end":17540.031,"desc":"forward seek amount","type":"seek","difference":11948.669999999998}
{"start":3977.1,"end":5289.361000000001,"index":0,"desc":"forward seek","type":"segment","premature":true,"difference":11948.669999999998}
{"start":17540.031,"end":19175.274,"index":10000,"desc":"pause","type":"segment","premature":true}
{"time":19175.274,"desc":"paused","type":"pause"}
```

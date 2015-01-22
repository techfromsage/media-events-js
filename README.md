## Terminology
 * index - the video is split into multiple parts (starts at 0). Each part has a length defined by the interval
 * interval - length of a index in milliseconds (currently 10 seconds long)
 * scrub - event that is triggered when a user either clicks somewhere on the video timeline or clicks and drags
 * tick - event that describes the amount of time spent within a index (maximum amount is the interval length)

## What are we trying to record for the video analytics?
 * Record how much time has been spent within a index
   * Example index 0 had 10 seconds watched, index 1 had 2 seconds watched, etc
 * When the video was paused (record the time)
 * Where seek events happened (record the difference between where the user seeked from to their destination)
 * Premature ticks (caused by seek/pause events)
   * Example: index 0 watched for 2 seconds, then a seek for 18 seconds, then index 2 watched for 10 seconds
   * Generated when either a seek or pause event happens

## Problem seen in live
The video analytics are being revamped due to the original implementation using timers to generate 
events. The timer would be set at the start of the stream and trigger 10 seconds later. The seeking
and pause events do not use timers. The main candidates for mis-aligning the analytics from the video 
timeline are buffering & code lag.

## Original fix approach
The HTML5 video element creates events such as played, seeking, seeked, paused, timeupdate, etc. The 
prototype found at https://github.com/talis/talis.com-app/tree/LIG-306-RemoveBufferingVideoAnalytics 
used the video events to create analytic events without the use of timers. As with all implementations 
that are spread across multiple browsers issues exist. The timing and order of the events are different
when using different browsers. One example of this problem is where chrome will update the current
time before triggering a seeking event. Safari on the other hand will trigger a seeking event then time  
update. Another example is where chrome will pause the video while scrubbing, but will only set the
seeking flag while the mouse is moving along the video timeline. Safari on the other hand will set
the seek flag, but not the pause indicator.

## Proposal for a new fix
After discovering this world of pain and talking to Justin about my woes, it was suggested by Justin
to only monitor the trending of time changes within the video. It is not possible to ignore all 
other events as the paused and ended events need to be taken into consideration (no time update events
are created during these occasions). It is possible to see when a user seeked as the time update events
are generated every < 300ms and there would be a larger gap between the updates.

The code within the repo includes an example video page (index.html), tests to save my sanity & a file
called videoAnalytics.js. The videoAnalytics.js file includes logic to define when certain events have
been triggered. It has been designed to be separate from echo & tn so that it is easy to test.

My one concern about this approach is related to the assumption of how often a time update is triggered.
This might differ depending on how powerful the device is & browser.

## Events
Scrub Event: `{"start":3891.264,"end":9314.182999999999,"name":"forward","type":"scrub"}`
 * start: When the scrubbing started
 * end: Where the scrubbing ended
 * name: Descriptor
 * type: Type of event

Tick Event: `{"start":0,"end":3891.264,"name":"forward","type":"tick","premature":true}`
 * start: Where the playback started within a index
 * end: Where the playback ended within a index
 * name: Descriptor
 * type: Type of event
 * premature: If the tick finished at the end of a index or whether a seek/pause triggered the tick

Pause Event: `{"time":1262.166,"type":"pause","name":"paused"}`
 * time: When the pause event happened
 * type: Type of event
 * name: Descriptor

## How to test the solution
Checkout this code and open index.html in your browser. If you want to execute the tests open test.html.
All of the events that would be used to create echo events are outputted using console.info:

```
{"start":0,"end":10000,"name":"tick","type":"tick","premature":false}
{"start":12691.157000000001,"end":20701.316,"name":"forward","type":"scrub"}
{"start":10000,"end":12691.157000000001,"name":"forward","type":"tick","premature":true}
{"start":20701.316,"end":26753.861,"name":"pause","type":"tick","premature":true}
{"time":26753.861,"type":"pause","name":"paused"} 
```

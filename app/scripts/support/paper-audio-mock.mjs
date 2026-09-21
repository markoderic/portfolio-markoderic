import {AudioMock} from './fan-audio-mock.mjs';
// Extends the existing bounded mock with sample offsets used by expired rustles.
export class PaperAudioMock extends AudioMock {
 createBufferSource(){const source=super.createBufferSource(),start=source.start;source.start=(time,offset=0)=>{source.offset=offset;start(time);};return source;}
 advance(time){this.currentTime=time;for(const s of [...this.sources])if(s.started!==undefined&&!s.ended&&(s.stopped<=time||!s.loop&&s.started+s.buffer.duration-(s.offset||0)<=time)){s.ended=true;s.onended?.();}}
}

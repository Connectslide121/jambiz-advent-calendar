import { SoundService } from './sound.service';

describe('Game sound preferences and synthesis', () => {
  let preference: string | null;
  beforeEach(() => {
    preference = null;
    spyOn(Storage.prototype, 'getItem').and.callFake(() => preference);
  });

  it('starts enabled, remembers an explicit mute, and saves changes', () => {
    expect(new SoundService().enabled()).toBeTrue();
    preference = 'off';
    const sound = new SoundService();
    expect(sound.enabled()).toBeFalse();
    const write = spyOn(Storage.prototype, 'setItem');
    spyOn(sound, 'jingle');
    sound.toggle();
    expect(write).toHaveBeenCalledWith('jambiz-advent-sound', 'on');
    expect(sound.enabled()).toBeTrue();
    sound.toggle();
    expect(write).toHaveBeenCalledWith('jambiz-advent-sound', 'off');
    expect(sound.enabled()).toBeFalse();
  });

  it('keeps sound usable if browser storage is unavailable', () => {
    (Storage.prototype.getItem as jasmine.Spy).and.throwError('Storage unavailable');
    const sound = new SoundService();
    expect(sound.enabled()).toBeTrue();
    spyOn(Storage.prototype, 'setItem').and.throwError('Storage unavailable');
    sound.toggle();
    expect(sound.enabled()).toBeFalse();
  });

  it('does not create an audio context for muted game effects', () => {
    preference = 'off';
    const context = spyOn(window, 'AudioContext').and.callThrough();
    const sound = new SoundService();
    sound.bonk(); sound.crunch(); sound.bleat(); sound.whoosh(); sound.tap(); sound.bell(); sound.jingle();
    expect(context).not.toHaveBeenCalled();
  });

  it('renders short, distinct, non-silent effects through Web Audio', async () => {
    const signatures: string[] = [];
    for (const effect of ['bonk', 'crunch', 'bleat', 'whoosh', 'tap'] as const) {
      const ctx = new OfflineAudioContext(1, 22050 / 2, 22050);
      const sound = new SoundService();
      const internals = sound as unknown as { context(): AudioContext | null; master: GainNode };
      internals.master = ctx.createGain();
      internals.master.connect(ctx.destination);
      spyOn(internals, 'context').and.returnValue(ctx as unknown as AudioContext);
      sound[effect]();
      const samples = (await ctx.startRendering()).getChannelData(0);
      expect(samples.some(value => Math.abs(value) > 0.001)).withContext(effect).toBeTrue();
      let active = 0;
      let crossings = 0;
      for (let i = 1; i < samples.length; i++) {
        if (Math.abs(samples[i]) > 0.001) active++;
        if (samples[i] * samples[i - 1] < 0) crossings++;
      }
      signatures.push(`${active}:${crossings}`);
    }
    expect(new Set(signatures).size).toBe(5);
  });
});

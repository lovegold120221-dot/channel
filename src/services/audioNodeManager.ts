export const audioNodeManager = {
  context: null as AudioContext | null,
  sourceNode: null as MediaElementAudioSourceNode | null,
  getSharedContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass();
    }
    return this.context;
  },
  getSharedSourceNode(mediaElement: HTMLMediaElement) {
    const ctx = this.getSharedContext();
    if (!this.sourceNode) {
      this.sourceNode = ctx.createMediaElementSource(mediaElement);
    }
    return this.sourceNode;
  }
};

import { create } from "zustand";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  // Optional: queued tracks start without a stream URL; the player resolves it
  // on demand when the track becomes current (so next/prev work on a list).
  streamUrl?: string;
  durationS?: number;
  likedByMe?: boolean;
}

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  volume: number;
  queue: PlayerTrack[];
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (volume: number) => void;
  addToQueue: (track: PlayerTrack) => void;
  setQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

function pickNextIndex(
  queue: PlayerTrack[],
  currentIndex: number,
  shuffle: boolean,
): number {
  if (queue.length <= 1) return currentIndex;

  if (shuffle) {
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
    return nextIndex;
  }

  return (currentIndex + 1) % queue.length;
}

function pickPrevIndex(
  queue: PlayerTrack[],
  currentIndex: number,
  shuffle: boolean,
): number {
  if (queue.length <= 1) return currentIndex;

  if (shuffle) {
    let prevIndex = currentIndex;
    while (prevIndex === currentIndex) {
      prevIndex = Math.floor(Math.random() * queue.length);
    }
    return prevIndex;
  }

  return currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  queue: [],
  currentIndex: -1,
  shuffle: false,
  repeat: "off",

  play: (track) => {
    const { queue } = get();
    const index = queue.findIndex((item) => item.id === track.id);

    set({
      currentTrack: track,
      isPlaying: true,
      currentIndex: index >= 0 ? index : get().currentIndex,
    });
  },

  pause: () => set({ isPlaying: false }),

  togglePlay: () => {
    const { currentTrack, isPlaying } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
  },

  next: () => {
    const { queue, currentIndex, shuffle, repeat, currentTrack } = get();
    if (queue.length === 0 || !currentTrack) return;

    if (repeat === "one") {
      set({ isPlaying: true });
      return;
    }

    const nextIndex = pickNextIndex(queue, currentIndex, shuffle);
    const nextTrack = queue[nextIndex];

    if (!nextTrack) return;

    if (nextIndex === 0 && repeat === "off" && !shuffle && currentIndex === queue.length - 1) {
      set({ isPlaying: false });
      return;
    }

    set({
      currentIndex: nextIndex,
      currentTrack: nextTrack,
      isPlaying: true,
    });
  },

  prev: () => {
    const { queue, currentIndex, shuffle, currentTrack } = get();
    if (queue.length === 0 || !currentTrack) return;

    const prevIndex = pickPrevIndex(queue, currentIndex, shuffle);
    const prevTrack = queue[prevIndex];
    if (!prevTrack) return;

    set({
      currentIndex: prevIndex,
      currentTrack: prevTrack,
      isPlaying: true,
    });
  },

  setVolume: (volume) =>
    set({ volume: Math.min(1, Math.max(0, volume)) }),

  addToQueue: (track) =>
    set((state) => ({
      queue: [...state.queue, track],
    })),

  setQueue: (tracks, startIndex = 0) => {
    const currentTrack = tracks[startIndex] ?? null;
    set({
      queue: tracks,
      currentIndex: tracks.length > 0 ? startIndex : -1,
      currentTrack,
      isPlaying: currentTrack !== null,
    });
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  toggleRepeat: () =>
    set((state) => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const currentModeIndex = modes.indexOf(state.repeat);
      const nextMode = modes[(currentModeIndex + 1) % modes.length] ?? "off";
      return { repeat: nextMode };
    }),
}));

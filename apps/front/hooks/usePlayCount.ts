"use client";

import { useEffect, useState } from "react";

import {
  PLAY_RECORDED_EVENT,
  type PlayRecordedDetail,
} from "@/lib/playTrack";

export function usePlayCount(trackId: string, initial: number): number {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    setCount(initial);
  }, [trackId, initial]);

  useEffect(() => {
    const onPlayRecorded = (event: Event) => {
      const { trackId: id, playCount } = (event as CustomEvent<PlayRecordedDetail>)
        .detail;
      if (id === trackId) {
        setCount(playCount);
      }
    };

    window.addEventListener(PLAY_RECORDED_EVENT, onPlayRecorded);
    return () => window.removeEventListener(PLAY_RECORDED_EVENT, onPlayRecorded);
  }, [trackId]);

  return count;
}

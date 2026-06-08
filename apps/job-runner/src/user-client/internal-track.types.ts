import { TrackStatus } from '@prisma/client';

export interface InternalTrackUpdatePayload {
  status: TrackStatus;
  s3KeyStd?: string;
  s3KeyHq?: string;
  waveformJson?: number[];
}

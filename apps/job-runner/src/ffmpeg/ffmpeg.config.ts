import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export function getFfmpegPath(): string {
  const configured = process.env['FFMPEG_PATH']?.trim();
  if (configured) return configured;
  return ffmpegInstaller.path;
}

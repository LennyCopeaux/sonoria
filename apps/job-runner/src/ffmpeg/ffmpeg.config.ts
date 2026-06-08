import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export function getFfmpegPath(): string {
  return process.env['FFMPEG_PATH'] ?? ffmpegInstaller.path;
}

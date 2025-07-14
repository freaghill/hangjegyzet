declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    input(source: string): FfmpegCommand;
    inputOptions(...options: string[]): FfmpegCommand;
    output(target: string): FfmpegCommand;
    outputOptions(...options: string[]): FfmpegCommand;
    on(event: string, callback: Function): FfmpegCommand;
    run(): void;
    kill(signal?: string): void;
    ffprobe(callback: (err: any, data: any) => void): void;
  }

  interface FfmpegStatic {
    (input?: string): FfmpegCommand;
    ffprobe(file: string, callback: (err: any, data: any) => void): void;
  }

  const ffmpeg: FfmpegStatic;
  export = ffmpeg;
}
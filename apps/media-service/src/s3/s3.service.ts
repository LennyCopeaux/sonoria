import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.getOrThrow<string>('S3_ENDPOINT');
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    const forcePathStyle =
      this.config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true';

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });

    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
  }

  buildOriginalKey(trackId: string, filename: string): string {
    return `tracks/${trackId}/original/${filename}`;
  }

  buildTranscodedKey(trackId: string, quality: 'std' | 'hq'): string {
    return `tracks/${trackId}/${quality}.mp3`;
  }

  async createPresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async createPresignedGetUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async findFirstOriginalKey(trackId: string): Promise<string | null> {
    const prefix = `tracks/${trackId}/original/`;
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: 1,
      }),
    );

    const key = response.Contents?.[0]?.Key;
    return key ?? null;
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deleteTrackObjects(trackId: string): Promise<void> {
    const prefix = `tracks/${trackId}/`;
    const keys: string[] = [];

    let continuationToken: string | undefined;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of response.Contents ?? []) {
        if (item.Key) keys.push(item.Key);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    await Promise.all(keys.map((key) => this.deleteObject(key)));
  }
}

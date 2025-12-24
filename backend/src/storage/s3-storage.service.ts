import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class S3StorageService {
    private s3 = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    endpoint: process.env.AWS_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  async uploadBuffer(
    buf: Buffer,
    opts: { prefix: string; originalName: string; contentType?: string }
  ) {
    const bucket = process.env.AWS_S3_BUCKET!;
    const ext = extname(opts.originalName) || '';
    const key = `${opts.prefix.replace(/\/?$/, '/')}${randomUUID()}${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: opts.contentType || 'application/octet-stream',
    }));

    return { key };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadFileInput {
  tenantId: string;
  patientId: string;
  evolutionId?: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface UploadedFile {
  bucket: string;
  key: string;
  fileSize: number;
  presignedUrl: string;  // short-lived URL for immediate use
}

/**
 * StorageService
 *
 * Handles HIPAA-compliant file uploads to AWS S3.
 *
 * Security properties:
 *  - Bucket must have server-side encryption (SSE-KMS) enabled.
 *  - Files are stored with tenant and patient path isolation.
 *  - Pre-signed URLs expire in 15 minutes.
 *  - Objects are never publicly accessible (bucket policy: no public reads).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
    this.bucket =
      this.configService.get<string>('AWS_S3_BUCKET_CLINICAL') ?? '';
  }

  async upload(input: UploadFileInput): Promise<UploadedFile> {
    const extension = this.getExtension(input.originalName);
    const fileId = uuidv4();
    // Path: tenants/{tenantId}/patients/{patientId}/{fileId}.{ext}
    const key = `tenants/${input.tenantId}/patients/${input.patientId}/${fileId}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
      ServerSideEncryption: 'aws:kms',
      Metadata: {
        tenantId: input.tenantId,
        patientId: input.patientId,
        ...(input.evolutionId && { evolutionId: input.evolutionId }),
        originalName: encodeURIComponent(input.originalName),
      },
    });

    await this.s3.send(command);
    this.logger.log(`Uploaded ${key} to ${this.bucket}`);

    const presignedUrl = await this.getPresignedUrl(key);

    return {
      bucket: this.bucket,
      key,
      fileSize: input.buffer.length,
      presignedUrl,
    };
  }

  async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.s3.send(command);
    this.logger.log(`Deleted ${key} from ${this.bucket}`);
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }
}

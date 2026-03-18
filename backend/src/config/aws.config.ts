import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION ?? 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3BucketClinical: process.env.AWS_S3_BUCKET_CLINICAL,
  healthLakeDatastoreId: process.env.AWS_HEALTHLAKE_DATASTORE_ID,
  healthLakeEndpoint: process.env.AWS_HEALTHLAKE_ENDPOINT,
}));

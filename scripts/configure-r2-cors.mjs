import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.STORAGE_ENDPOINT?.replace(/\/+$/, "");
const bucket = process.env.STORAGE_BUCKET;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
const origins = (process.env.STORAGE_CORS_ORIGINS ?? "http://localhost:3000,https://satgas.beres.io")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  throw new Error("STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY are required.");
}

const client = new S3Client({
  endpoint,
  region: process.env.STORAGE_REGION ?? "auto",
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

await client.send(new PutBucketCorsCommand({
  Bucket: bucket,
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: origins,
      AllowedMethods: ["PUT", "GET"],
      AllowedHeaders: ["Content-Type"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    }],
  },
}));

console.log(`Configured R2 CORS for ${bucket}: ${origins.join(", ")}`);

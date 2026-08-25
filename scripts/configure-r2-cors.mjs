import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

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

const corsConfiguration = {
  CORSRules: [{
    AllowedOrigins: origins,
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["Content-Type"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  }],
};

await client.send(new PutBucketCorsCommand({
  Bucket: bucket,
  CORSConfiguration: corsConfiguration,
}));

const applied = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
const isVerified = applied.CORSRules?.some((rule) =>
  origins.every((origin) => rule.AllowedOrigins?.includes(origin))
  && ["PUT", "GET", "HEAD"].every((method) => rule.AllowedMethods?.includes(method))
  && rule.AllowedHeaders?.some((header) => header.toLowerCase() === "content-type"),
);

if (!isVerified) throw new Error("R2 CORS policy was saved but could not be verified. Do not deploy until GET Bucket CORS returns the expected browser upload policy.");
console.log(`Configured and verified R2 CORS for ${bucket}: ${origins.join(", ")}`);

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

function getR2Endpoint(): string | null {
  const explicit = process.env.R2_ENDPOINT?.trim();
  let endpoint: string | null = null;

  if (explicit) {
    endpoint = explicit.replace(/\/$/, "");
  } else {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    if (accountId) endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }

  if (!endpoint) return null;

  // Some dashboards paste the bucket name into the endpoint URL — strip it.
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (bucket) {
    const bucketSuffix = `/${bucket}`;
    if (endpoint.endsWith(bucketSuffix)) {
      endpoint = endpoint.slice(0, -bucketSuffix.length);
    }
  }

  return endpoint;
}

export function getR2ConfigStatus() {
  return {
    configured: isR2Configured(),
    bucket: process.env.R2_BUCKET_NAME?.trim() || null,
    endpoint: getR2Endpoint(),
    hasAccessKey: Boolean(process.env.R2_ACCESS_KEY_ID?.trim()),
    hasSecretKey: Boolean(process.env.R2_SECRET_ACCESS_KEY?.trim()),
  };
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim() &&
      getR2Endpoint()
  );
}

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (client) return client;

  const endpoint = getR2Endpoint();
  if (!endpoint) {
    throw new Error("R2 endpoint is not configured");
  }

  client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  });

  return client;
}

/** Map `/uploads/...` paths to R2 object keys inside the bucket. */
export function filePathToR2Key(relativePath: string): string {
  return relativePath.replace(/^\//, "");
}

export async function putR2Object(
  key: string,
  body: Buffer,
  contentType?: string | null
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!.trim(),
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );
}

export async function getR2Object(key: string): Promise<Buffer | null> {
  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!.trim(),
        Key: key,
      })
    );
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch (error) {
    const err = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    if (
      err.name === "NoSuchKey" ||
      err.name === "NotFound" ||
      err.Code === "NoSuchKey" ||
      err.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!.trim(),
        Key: key,
      })
    );
    return true;
  } catch (error) {
    const err = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    if (
      err.name === "NotFound" ||
      err.name === "NoSuchKey" ||
      err.Code === "NoSuchKey" ||
      err.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}

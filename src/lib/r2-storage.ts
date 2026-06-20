import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

function getR2Endpoint(): string | null {
  const explicit = process.env.R2_ENDPOINT?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;

  return null;
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
    const name = (error as { name?: string }).name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
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
    const name = (error as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") return false;
    throw error;
  }
}

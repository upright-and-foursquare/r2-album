import { readFileSync } from "fs";
import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

console.log("Bucket:", env.R2_BUCKET_NAME);
console.log("Public URL:", env.R2_PUBLIC_URL);

try {
  const all = await client.send(
    new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, MaxKeys: 20 }),
  );
  console.log("All objects:", all.KeyCount ?? 0);
  for (const item of all.Contents ?? []) {
    console.log(" -", item.Key);
  }

  const images = await client.send(
    new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      Prefix: "images/",
      MaxKeys: 20,
    }),
  );
  console.log("images/ prefix:", images.KeyCount ?? 0);

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: "images/test/health-check.txt",
    ContentType: "text/plain",
    Body: "ok",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  console.log("Presign OK:", uploadUrl.slice(0, 80) + "...");
} catch (error) {
  console.error("R2 error:", error.name, error.message);
  if (error.$metadata) {
    console.error("HTTP status:", error.$metadata.httpStatusCode);
  }
  process.exit(1);
}

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

export type UploadScope = "products" | "services" | "opportunities";

type ImageType = { mimeType: string; extension: string };

@Injectable()
export class MediaService {
  constructor(private readonly config: ConfigService) {}

  async uploadImage(scope: UploadScope, file: Express.Multer.File) {
    const imageType = this.detectImageType(file.buffer);
    if (!imageType) {
      throw new BadRequestException("Upload a valid JPEG, PNG, WebP, or AVIF image");
    }
    if (file.mimetype && file.mimetype !== imageType.mimeType) {
      throw new BadRequestException("The file content does not match its image type");
    }

    const accountId = this.required("R2_ACCOUNT_ID");
    const accessKeyId = this.required("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.required("R2_SECRET_ACCESS_KEY");
    const bucket = this.required("R2_BUCKET_NAME");
    const publicBaseUrl = this.required("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
    const now = new Date();
    const key = `${scope}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${imageType.extension}`;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });

    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: imageType.mimeType,
        CacheControl: "public, max-age=31536000, immutable"
      }));
    } catch {
      throw new ServiceUnavailableException("Image storage is temporarily unavailable");
    } finally {
      client.destroy();
    }

    return { key, url: `${publicBaseUrl}/${key}` };
  }

  private required(name: string) {
    const value = this.config.get<string>(name)?.trim();
    if (!value) throw new ServiceUnavailableException("Image uploads are not configured");
    return value;
  }

  private detectImageType(buffer: Buffer): ImageType | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mimeType: "image/jpeg", extension: "jpg" };
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { mimeType: "image/png", extension: "png" };
    }
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      return { mimeType: "image/webp", extension: "webp" };
    }
    if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
      const brands = buffer.toString("ascii", 8, Math.min(buffer.length, 32));
      if (brands.includes("avif") || brands.includes("avis")) {
        return { mimeType: "image/avif", extension: "avif" };
      }
    }
    return null;
  }
}

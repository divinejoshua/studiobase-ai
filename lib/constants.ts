export const S3_USER_UPLOAD_PREFIX = "studiobase_image_uploads";

export const S3_GENERATION_PREFIX = "studiobase_generations";

export const PRESIGNED_URL_TTL_SECONDS = 60 * 60;

export const MAX_REFERENCE_IMAGES = 4;

export const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_REFERENCE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

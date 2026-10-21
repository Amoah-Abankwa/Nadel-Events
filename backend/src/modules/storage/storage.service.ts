import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import type { Env } from '../../config/env';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FORMATS = ['jpg', 'png', 'webp'];

/**
 * What an upload is for:
 *  - "catalogue": product, banner and category photos. Public delivery type ("upload").
 *  - "request":   customers' cake/event reference photos. "authenticated" type: never public,
 *                 only viewable through short-lived download links issued by the API.
 */
export type UploadPurpose = 'catalogue' | 'request';

export interface UploadTicket {
  uploadUrl: string;
  fields: Record<string, string>; // send as multipart form fields together with "file"
  publicId: string; // full id (folder/name) to confirm afterwards
  maxBytes: number;
  allowedFormats: string[];
}

/** Stored reference for a private photo: "cld:<format>:<public id>". */
const REF_PREFIX = 'cld:';
const toRef = (format: string, publicId: string) => `${REF_PREFIX}${format}:${publicId}`;
function parseRef(ref: string): { format: string; publicId: string } | null {
  if (!ref.startsWith(REF_PREFIX)) return null;
  const rest = ref.slice(REF_PREFIX.length);
  const i = rest.indexOf(':');
  return i > 0 ? { format: rest.slice(0, i), publicId: rest.slice(i + 1) } : null;
}

/**
 * Cloudinary with SIGNED direct uploads:
 *  1. the API signs the upload parameters with the API secret (never sent to the browser);
 *  2. the browser posts the file straight to Cloudinary;
 *  3. the API confirms it with the Admin API (folder, type, real image format, size) and
 *     deletes anything that doesn't meet the rules before accepting it.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly enabled: boolean;
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    this.cloudName = config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    this.apiKey = config.get('CLOUDINARY_API_KEY', { infer: true });
    this.apiSecret = config.get('CLOUDINARY_API_SECRET', { infer: true });
    this.root = config.get('CLOUDINARY_FOLDER', { infer: true });
    this.enabled = Boolean(this.cloudName && this.apiKey && this.apiSecret);
    if (this.enabled) cloudinary.config({ cloud_name: this.cloudName, api_key: this.apiKey, api_secret: this.apiSecret, secure: true });
  }

  private folderFor(purpose: UploadPurpose, ownerId: string) {
    return purpose === 'request' ? `${this.root}/requests/${ownerId}` : `${this.root}/catalogue/${new Date().getUTCFullYear()}`;
  }

  private typeFor(purpose: UploadPurpose) {
    return purpose === 'request' ? 'authenticated' : 'upload';
  }

  private assertEnabled() {
    if (!this.enabled) throw new ServiceUnavailableException({ code: 'UPLOADS_NOT_CONFIGURED', message: 'Photo uploads are not set up yet.' });
  }

  /** Step 1: a one-off signed ticket. The signature covers folder, name, type and allowed formats. */
  signUpload(purpose: UploadPurpose, ownerId: string): UploadTicket {
    this.assertEnabled();
    const folder = this.folderFor(purpose, ownerId);
    const name = randomUUID();
    const params = {
      timestamp: String(Math.round(Date.now() / 1000)),
      folder,
      public_id: name,
      type: this.typeFor(purpose),
      allowed_formats: FORMATS.join(','),
      overwrite: 'false',
    };
    const signature = cloudinary.utils.api_sign_request(params, this.apiSecret!);
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      fields: { ...params, api_key: this.apiKey!, signature },
      publicId: `${folder}/${name}`,
      maxBytes: MAX_IMAGE_BYTES,
      allowedFormats: FORMATS,
    };
  }

  /** Step 3: verify what actually landed in Cloudinary; delete and refuse anything off-policy. */
  private async verify(purpose: UploadPurpose, ownerId: string, publicId: string) {
    this.assertEnabled();
    const prefix = purpose === 'request' ? `${this.folderFor(purpose, ownerId)}/` : `${this.root}/catalogue/`;
    if (!publicId.startsWith(prefix) || publicId.includes('..')) {
      throw new BadRequestException({ code: 'UPLOAD_INVALID', message: 'Upload the photo again.' });
    }
    const type = this.typeFor(purpose);
    let res: { format: string; bytes: number; secure_url: string; resource_type: string };
    try {
      res = await cloudinary.api.resource(publicId, { type, resource_type: 'image' });
    } catch {
      throw new BadRequestException({ code: 'UPLOAD_NOT_FOUND', message: 'We couldn’t find that upload. Try again.' });
    }
    if (!FORMATS.includes(res.format) || res.bytes > MAX_IMAGE_BYTES) {
      await cloudinary.uploader.destroy(publicId, { type, resource_type: 'image', invalidate: true }).catch(() => undefined);
      throw new BadRequestException({ code: 'UNSUPPORTED_IMAGE', message: 'Use a JPG, PNG or WebP image up to 5 MB.' });
    }
    return res;
  }

  /** Catalogue photo: returns the public HTTPS URL to store on the product, banner or category. */
  async confirmCatalogue(publicId: string): Promise<string> {
    const res = await this.verify('catalogue', '', publicId);
    return res.secure_url;
  }

  /** Customer reference photo: returns the private reference to store, plus a preview link. */
  async confirmRequestPhoto(ownerId: string, publicId: string): Promise<{ path: string; previewUrl: string }> {
    const res = await this.verify('request', ownerId, publicId);
    const path = toRef(res.format, publicId);
    const [previewUrl] = await this.signedUrls([path]);
    return { path, previewUrl };
  }

  /** Is this stored reference one of this customer's own uploads? */
  ownsRequestPhoto(ref: string, ownerId: string): boolean {
    const r = parseRef(ref);
    return Boolean(r && r.publicId.startsWith(`${this.folderFor('request', ownerId)}/`) && !r.publicId.includes('..'));
  }

  /** Short-lived links (default 1 hour) to private reference photos, for staff and their owner. */
  async signedUrls(refs: string[], ttlSeconds = 3600): Promise<string[]> {
    if (!this.enabled || !refs.length) return [];
    const expires_at = Math.round(Date.now() / 1000) + ttlSeconds;
    return refs
      .map(parseRef)
      .filter((r): r is { format: string; publicId: string } => Boolean(r))
      .map((r) => cloudinary.utils.private_download_url(r.publicId, r.format, { type: 'authenticated', resource_type: 'image', expires_at }));
  }

  /** Permanently delete private photos (account deletion, data retention). */
  async removePrivate(refs: string[]) {
    if (!this.enabled) return;
    for (const r of refs.map(parseRef)) {
      if (!r) continue;
      await cloudinary.uploader.destroy(r.publicId, { type: 'authenticated', resource_type: 'image', invalidate: true })
        .catch((e) => this.logger.warn(`Could not delete ${r.publicId}: ${e}`));
    }
  }
}

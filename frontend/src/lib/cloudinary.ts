import { api } from './api/client';
import { ApiError } from './api/errors';

/** Ticket from our API: Cloudinary upload URL plus the signed form fields (no secret inside). */
interface UploadTicket {
  uploadUrl: string;
  fields: Record<string, string>;
  publicId: string;
  maxBytes: number;
  allowedFormats: string[];
}

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Signed direct upload, used by every photo picker:
 *  1. ask our API to sign the upload,
 *  2. send the file straight to Cloudinary,
 *  3. ask our API to confirm it (the API re-checks type, size and folder with Cloudinary).
 */
export async function signedUpload<T>(file: File, signPath: string, confirmPath: string): Promise<T> {
  if (!TYPES.includes(file.type)) throw new ApiError(400, 'UNSUPPORTED_IMAGE', 'Use a JPG, PNG or WebP image.');
  const ticket = (await api.post<UploadTicket>(signPath)).data;
  if (file.size > ticket.maxBytes) throw new ApiError(400, 'FILE_TOO_LARGE', `${file.name} is larger than ${Math.round(ticket.maxBytes / 1024 / 1024)} MB.`);

  const form = new FormData();
  for (const [k, v] of Object.entries(ticket.fields)) form.append(k, v);
  form.append('file', file);
  const res = await fetch(ticket.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new ApiError(res.status, 'UPLOAD_FAILED', body.error?.message?.includes('format') ? 'Use a JPG, PNG or WebP image.' : 'The photo didn’t upload. Check your connection and try again.');
  }
  return (await api.post<T>(confirmPath, { publicId: ticket.publicId })).data;
}

/**
 * Cloudinary delivery URL with automatic format/quality and an optional width, for plain <img>
 * tags (banners). Non-Cloudinary URLs are returned unchanged.
 */
export function cloudinaryUrl(src: string, width?: number): string {
  if (!src.includes('res.cloudinary.com') || !src.includes('/image/upload/')) return src;
  const t = ['f_auto', 'q_auto', ...(width ? [`w_${width}`, 'c_limit'] : [])].join(',');
  return src.replace('/image/upload/', `/image/upload/${t}/`);
}

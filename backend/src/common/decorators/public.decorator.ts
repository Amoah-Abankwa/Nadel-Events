import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Skip authentication for this route or controller (a session is still read if present). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

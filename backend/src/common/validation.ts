/** Validation rules shared by every DTO, so the same input is accepted everywhere. */

/** Ghana phone numbers as typed: "024 400 0000", "+233 24 400 0000". */
export const PHONE_RE = /^\+?[0-9 ]{9,16}$/;
export const PHONE_MESSAGE = 'Enter a valid phone number';

/** Money as a decimal string with up to 2 decimals, e.g. "145" or "145.50". */
export const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;

export const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
export const trimUpper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

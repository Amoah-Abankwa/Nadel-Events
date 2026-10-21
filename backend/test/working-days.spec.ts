import { workingDayDeadline } from '../src/common/utils/working-days';

const d = (s: string) => new Date(`${s}T10:00:00Z`);

describe('workingDayDeadline (returns window)', () => {
  it('counts 3 working days after a Monday completion', () => {
    // Mon 12 Oct 2026 -> Tue, Wed, Thu
    expect(workingDayDeadline(d('2026-10-12'), 3, [])!.toISOString()).toBe('2026-10-15T23:59:59.999Z');
  });

  it('skips the weekend', () => {
    // Fri 16 Oct 2026 -> Mon, Tue, Wed
    expect(workingDayDeadline(d('2026-10-16'), 3, [])!.toISOString()).toBe('2026-10-21T23:59:59.999Z');
  });

  it('skips owner-listed public holidays', () => {
    expect(workingDayDeadline(d('2026-10-16'), 3, ['2026-10-19'])!.toISOString()).toBe('2026-10-22T23:59:59.999Z');
  });

  it('returns null for non-returnable items', () => {
    expect(workingDayDeadline(d('2026-10-12'), 0, [])).toBeNull();
  });
});

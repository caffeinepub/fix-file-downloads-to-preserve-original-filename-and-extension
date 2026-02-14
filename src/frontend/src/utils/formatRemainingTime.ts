/**
 * Formats backend remaining time (nanoseconds bigint) into a minute-granularity English string.
 * Examples: "9 min", "1 hr 10 min", "2 hrs 45 min", "3 days 5 hrs"
 */
export function formatRemainingTime(nanoseconds: bigint): string {
  const totalSeconds = Number(nanoseconds) / 1_000_000_000;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    const remainingHours = totalHours % 24;
    if (remainingHours > 0) {
      return `${totalDays} day${totalDays > 1 ? 's' : ''} ${remainingHours} hr${remainingHours > 1 ? 's' : ''}`;
    }
    return `${totalDays} day${totalDays > 1 ? 's' : ''}`;
  }

  if (totalHours > 0) {
    const remainingMinutes = totalMinutes % 60;
    if (remainingMinutes > 0) {
      return `${totalHours} hr${totalHours > 1 ? 's' : ''} ${remainingMinutes} min`;
    }
    return `${totalHours} hr${totalHours > 1 ? 's' : ''}`;
  }

  if (totalMinutes > 0) {
    return `${totalMinutes} min`;
  }

  return 'Less than 1 min';
}

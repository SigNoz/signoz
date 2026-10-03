import dayjs from 'dayjs';
import relativeTimePlugin from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTimePlugin);

/** "2 months ago". The exact timestamp stays available on hover. */
export function toRelativeTime(value: string | undefined): string {
	const parsed = value ? dayjs(value) : null;
	return parsed?.isValid() ? parsed.fromNow() : '-';
}

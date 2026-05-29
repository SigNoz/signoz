import dayjs from 'dayjs';
import { isEmpty } from 'lodash-es';
import type { DashboardtypesGettableDashboardWithPinDTO } from 'api/generated/services/sigNoz.schemas';

export type DashboardListItem = DashboardtypesGettableDashboardWithPinDTO;

export const tagsToStrings = (
	tags: { key: string; value: string }[] | null | undefined,
): string[] =>
	(tags ?? []).map((tag) =>
		tag.key === tag.value ? tag.key : `${tag.key}:${tag.value}`,
	);

export const lastUpdatedLabel = (time: string | undefined): string => {
	if (!time || isEmpty(time)) {
		return 'No updates yet!';
	}
	const diff = dayjs();
	const ref = dayjs(time);
	const months = diff.diff(ref, 'months');
	if (months > 0) {
		return `Last Updated ${months} months ago`;
	}
	const days = diff.diff(ref, 'days');
	if (days > 0) {
		return `Last Updated ${days} days ago`;
	}
	const hours = diff.diff(ref, 'hours');
	if (hours > 0) {
		return `Last Updated ${hours} hrs ago`;
	}
	const minutes = diff.diff(ref, 'minutes');
	if (minutes > 0) {
		return `Last Updated ${minutes} mins ago`;
	}
	const seconds = diff.diff(ref, 'seconds');
	return `Last Updated ${seconds} sec ago`;
};

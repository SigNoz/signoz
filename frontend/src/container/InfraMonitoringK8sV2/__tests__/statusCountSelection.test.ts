import {
	InframonitoringtypesContainerCountsByStatusDTO,
	InframonitoringtypesContainerStatusDTO,
	InframonitoringtypesPodCountsByStatusDTO,
	InframonitoringtypesPodStatusDTO,
} from 'api/generated/services/sigNoz.schemas';

import { getPodStatusItems } from '../commonUtils';
import { getContainerStatusItems } from '../Containers/utils';

const POD_COUNT_KEYS: Array<keyof InframonitoringtypesPodCountsByStatusDTO> = [
	'running',
	'completed',
	'pending',
	'unknown',
	'failed',
	'crashLoopBackOff',
	'imagePullBackOff',
	'errImagePull',
	'createContainerConfigError',
	'containerCreating',
	'oomKilled',
	'error',
	'containerCannotRun',
	'evicted',
	'nodeAffinity',
	'nodeLost',
	'shutdown',
	'unexpectedAdmissionError',
];

function podCounts(): InframonitoringtypesPodCountsByStatusDTO {
	return POD_COUNT_KEYS.reduce(
		(acc, key) => ({ ...acc, [key]: 1 }),
		{} as InframonitoringtypesPodCountsByStatusDTO,
	);
}

function containerCounts(): InframonitoringtypesContainerCountsByStatusDTO {
	return {
		running: 1,
		waiting: 1,
		terminated: 1,
		completed: 1,
		unknown: 1,
		containerCreating: 1,
		crashLoopBackOff: 1,
		imagePullBackOff: 1,
		errImagePull: 1,
		createContainerConfigError: 1,
		oomKilled: 1,
		error: 1,
		containerCannotRun: 1,
	} as InframonitoringtypesContainerCountsByStatusDTO;
}

describe('status counts carry filterable statuses', () => {
	it('maps every pod count bucket to a real status enum member', () => {
		const items = getPodStatusItems(podCounts());
		const statuses = items.flatMap((item) => item.statuses ?? []);
		const valid = Object.values(InframonitoringtypesPodStatusDTO) as string[];

		expect(statuses.length).toBeGreaterThan(0);
		statuses.forEach((status) => expect(valid).toContain(status));
	});

	it('gives the pod Error Status chip every error bucket it sums', () => {
		const items = getPodStatusItems(podCounts());
		const errorItem = items.find((item) => item.label === 'Error Status');

		// The chip's own value is the sum of its breakdown, so selecting it must
		// select every status counted in that sum.
		expect(errorItem?.value).toBe(errorItem?.breakdown?.length);
		expect(errorItem?.statuses).toHaveLength(errorItem?.breakdown?.length ?? 0);
	});

	it('maps every container count bucket to a real status enum member', () => {
		const items = getContainerStatusItems(containerCounts());
		const statuses = items.flatMap((item) => item.statuses ?? []);
		const valid = Object.values(
			InframonitoringtypesContainerStatusDTO,
		) as string[];

		expect(statuses.length).toBeGreaterThan(0);
		statuses.forEach((status) => expect(valid).toContain(status));
	});
});

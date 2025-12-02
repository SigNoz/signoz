import { DowntimeSchedules } from 'api/plannedDowntime/getAllDowntimeSchedules';

export const buildSchedule = (
	schedule: Partial<DowntimeSchedules['schedule']>,
): DowntimeSchedules['schedule'] => ({
	timezone: schedule?.timezone ?? null,
	startTime: schedule?.startTime ?? null,
	endTime: schedule?.endTime ?? null,
	recurrence: schedule?.recurrence ?? null,
});

export const createMockDowntime = (
	overrides: Partial<DowntimeSchedules>,
): DowntimeSchedules => ({
	id: overrides.id ?? 0,
	name: overrides.name ?? null,
	description: overrides.description ?? null,
	schedule: buildSchedule({
		timezone: 'UTC',
		startTime: '2024-01-01',
		...overrides.schedule,
	}),
	alertIds: overrides.alertIds ?? null,
	createdAt: overrides.createdAt ?? null,
	createdBy: overrides.createdBy ?? null,
	updatedAt: overrides.updatedAt ?? null,
	updatedBy: overrides.updatedBy ?? null,
	kind: overrides.kind ?? null,
});

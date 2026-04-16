import type {
	RuletypesGettablePlannedMaintenanceDTO,
	RuletypesScheduleDTO,
} from 'api/generated/services/sigNoz.schemas';

export const buildSchedule = (
	schedule: Partial<RuletypesScheduleDTO>,
): RuletypesScheduleDTO => ({
	timezone: schedule?.timezone ?? '',
	startTime: schedule?.startTime,
	endTime: schedule?.endTime,
	recurrence: schedule?.recurrence,
});

export const createMockDowntime = (
	overrides: Partial<RuletypesGettablePlannedMaintenanceDTO>,
): RuletypesGettablePlannedMaintenanceDTO => ({
	id: overrides.id ?? '0',
	name: overrides.name ?? '',
	description: overrides.description ?? '',
	schedule: buildSchedule({
		timezone: 'UTC',
		startTime: ('2024-01-01' as unknown) as Date,
		...overrides.schedule,
	}),
	alertIds: overrides.alertIds ?? [],
	createdAt: overrides.createdAt,
	createdBy: overrides.createdBy ?? '',
	updatedAt: overrides.updatedAt,
	updatedBy: overrides.updatedBy ?? '',
	kind: overrides.kind ?? '',
});

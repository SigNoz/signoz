import type {
	AlertmanagertypesScheduleDTO,
	AlertmanagertypesPlannedMaintenanceDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	AlertmanagertypesMaintenanceKindDTO,
	AlertmanagertypesMaintenanceStatusDTO,
} from 'api/generated/services/sigNoz.schemas';

export const buildSchedule = (
	schedule: Partial<AlertmanagertypesScheduleDTO>,
): AlertmanagertypesScheduleDTO => ({
	timezone: schedule?.timezone ?? '',
	startTime: schedule?.startTime ?? '',
	endTime: schedule?.endTime,
	recurrence: schedule?.recurrence,
});

export const createMockDowntime = (
	overrides: Partial<AlertmanagertypesPlannedMaintenanceDTO>,
): AlertmanagertypesPlannedMaintenanceDTO => ({
	id: overrides.id ?? '0',
	name: overrides.name ?? '',
	description: overrides.description ?? '',
	schedule: buildSchedule({
		timezone: 'UTC',
		startTime: '2024-01-01',
		...overrides.schedule,
	}),
	alertIds: overrides.alertIds ?? [],
	createdAt: overrides.createdAt,
	createdBy: overrides.createdBy ?? '',
	updatedAt: overrides.updatedAt,
	updatedBy: overrides.updatedBy ?? '',
	kind: overrides.kind ?? AlertmanagertypesMaintenanceKindDTO.recurring,
	status: overrides.status ?? AlertmanagertypesMaintenanceStatusDTO.active,
});

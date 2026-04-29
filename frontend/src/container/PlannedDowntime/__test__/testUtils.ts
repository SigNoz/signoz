import type {
	RuletypesPlannedMaintenanceDTO,
	RuletypesScheduleDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	RuletypesMaintenanceKindDTO,
	RuletypesMaintenanceStatusDTO,
} from 'api/generated/services/sigNoz.schemas';

export const buildSchedule = (
	schedule: RuletypesScheduleDTO,
): RuletypesScheduleDTO => ({
	timezone: schedule?.timezone ?? '',
	startTime: schedule?.startTime,
	endTime: schedule?.endTime,
	recurrence: schedule?.recurrence,
});

export const createMockDowntime = (
	overrides: Partial<RuletypesPlannedMaintenanceDTO> &
		Pick<RuletypesPlannedMaintenanceDTO, 'schedule'>,
): RuletypesPlannedMaintenanceDTO => ({
	id: overrides.id ?? '0',
	name: overrides.name ?? '',
	description: overrides.description ?? '',
	schedule: overrides.schedule,
	alertIds: overrides.alertIds ?? [],
	createdAt: overrides.createdAt,
	createdBy: overrides.createdBy ?? '',
	updatedAt: overrides.updatedAt,
	updatedBy: overrides.updatedBy ?? '',
	kind: overrides.kind ?? RuletypesMaintenanceKindDTO.recurring,
	status: overrides.status ?? RuletypesMaintenanceStatusDTO.active,
});

import { LicensetypesGettableActiveLicenseDTO } from 'api/generated/services/sigNoz.schemas';
import {
	LicenseEvent,
	LicensePlatform,
	LicenseResModel,
	LicenseState,
	LicenseStatus,
} from 'types/api/licensesV3/getActive';

export const toLicenseResModel = (
	dto: LicensetypesGettableActiveLicenseDTO,
): LicenseResModel => ({
	id: dto.id,
	status: dto.status as LicenseStatus,
	state: dto.state as LicenseState,
	platform: dto.platform as LicensePlatform,
	plan: {
		id: dto.plan.id,
		name: dto.plan.name,
		description: dto.plan.description,
		isActive: dto.plan.isActive,
		createdAt: dto.plan.createdAt,
		updatedAt: dto.plan.updatedAt,
	},
	eventQueue: {
		event: dto.eventQueue.event as LicenseEvent,
		status: dto.eventQueue.status,
		scheduledAt: dto.eventQueue.scheduledAt,
		createdAt: dto.eventQueue.createdAt,
		updatedAt: dto.eventQueue.updatedAt,
	},
	freeUntil: dto.freeUntil,
	createdAt: dto.createdAt,
	updatedAt: dto.updatedAt,
	validFrom: dto.validFrom,
	validUntil: dto.validUntil,
});

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { LicensetypesFeatureDTO } from './licensetypesFeatureDTO';
import type { LicensetypesLicenseEventQueueDTO } from './licensetypesLicenseEventQueueDTO';
import type { LicensetypesLicensePlanDTO } from './licensetypesLicensePlanDTO';

export interface LicensetypesGettableActiveLicenseDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	eventQueue: LicensetypesLicenseEventQueueDTO;
	/**
	 * @type array
	 */
	features: LicensetypesFeatureDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	freeUntil: string;
	/**
	 * @type string
	 */
	id: string;
	plan: LicensetypesLicensePlanDTO;
	/**
	 * @type string
	 */
	platform: string;
	/**
	 * @type string
	 */
	state: string;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type integer
	 * @format int64
	 */
	validFrom: number;
	/**
	 * @type integer
	 * @format int64
	 */
	validUntil: number;
}

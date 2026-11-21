/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAccountConfigDTO } from './cloudintegrationtypesAccountConfigDTO';
import type { CloudintegrationtypesAgentReportDTO } from './cloudintegrationtypesAgentReportDTO';

export interface CloudintegrationtypesAccountDTO {
	agentReport: CloudintegrationtypesAgentReportDTO | null;
	config: CloudintegrationtypesAccountConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string,null
	 */
	providerAccountId: string | null;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removedAt: string | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesGoogleConfigDTODomainToAdminEmail } from './authtypesGoogleConfigDTODomainToAdminEmail';

export interface AuthtypesGoogleConfigDTO {
	/**
	 * @type array
	 */
	allowedGroups?: string[];
	/**
	 * @type string
	 */
	clientId: string;
	/**
	 * @type string
	 * @format password
	 */
	clientSecret: string;
	/**
	 * @type object
	 */
	domainToAdminEmail?: AuthtypesGoogleConfigDTODomainToAdminEmail;
	/**
	 * @type boolean
	 */
	fetchGroups?: boolean;
	/**
	 * @type boolean
	 */
	fetchTransitiveGroupMembership?: boolean;
	/**
	 * @type boolean
	 */
	insecureSkipEmailVerified?: boolean;
	/**
	 * @type string
	 * @format password
	 */
	serviceAccountJson?: string;
}

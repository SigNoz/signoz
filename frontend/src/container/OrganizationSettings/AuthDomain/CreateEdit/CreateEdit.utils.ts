import {
	AuthtypesGettableAuthDomainDTO,
	AuthtypesGoogleConfigDTO,
	AuthtypesOIDCConfigDTO,
	AuthtypesRoleMappingDTO,
	AuthtypesSamlConfigDTO,
} from 'api/generated/services/sigNoz.schemas';

// Form values interface for internal use (includes array-based fields for UI)
export interface FormValues {
	name?: string;
	ssoEnabled?: boolean;
	ssoType?: string;
	googleAuthConfig?: AuthtypesGoogleConfigDTO & {
		domainToAdminEmailList?: Array<{ domain?: string; adminEmail?: string }>;
	};
	samlConfig?: AuthtypesSamlConfigDTO;
	oidcConfig?: AuthtypesOIDCConfigDTO;
	roleMapping?: AuthtypesRoleMappingDTO & {
		groupMappingsList?: Array<{ groupName?: string; role?: string }>;
	};
}

/**
 * Converts groupMappingsList array to groupMappings Record for API
 */
export function convertGroupMappingsToRecord(
	groupMappingsList?: Array<{ groupName?: string; role?: string }>,
): Record<string, string> | undefined {
	if (!Array.isArray(groupMappingsList) || groupMappingsList.length === 0) {
		return undefined;
	}

	const groupMappings: Record<string, string> = {};
	groupMappingsList.forEach((item) => {
		if (item.groupName && item.role) {
			groupMappings[item.groupName] = item.role;
		}
	});

	return Object.keys(groupMappings).length > 0 ? groupMappings : undefined;
}

/**
 * Converts groupMappings Record to groupMappingsList array for form
 */
export function convertGroupMappingsToList(
	groupMappings?: Record<string, string> | null,
): Array<{ groupName: string; role: string }> {
	if (!groupMappings) {
		return [];
	}

	return Object.entries(groupMappings).map(([groupName, role]) => ({
		groupName,
		role,
	}));
}

/**
 * Converts domainToAdminEmailList array to domainToAdminEmail Record for API
 */
export function convertDomainMappingsToRecord(
	domainToAdminEmailList?: Array<{ domain?: string; adminEmail?: string }>,
): Record<string, string> | undefined {
	if (
		!Array.isArray(domainToAdminEmailList) ||
		domainToAdminEmailList.length === 0
	) {
		return undefined;
	}

	const domainToAdminEmail: Record<string, string> = {};
	domainToAdminEmailList.forEach((item) => {
		if (item.domain && item.adminEmail) {
			domainToAdminEmail[item.domain] = item.adminEmail;
		}
	});

	return Object.keys(domainToAdminEmail).length > 0
		? domainToAdminEmail
		: undefined;
}

/**
 * Converts domainToAdminEmail Record to domainToAdminEmailList array for form
 */
export function convertDomainMappingsToList(
	domainToAdminEmail?: Record<string, string>,
): Array<{ domain: string; adminEmail: string }> {
	if (!domainToAdminEmail) {
		return [];
	}

	return Object.entries(domainToAdminEmail).map(([domain, adminEmail]) => ({
		domain,
		adminEmail,
	}));
}

/**
 * Prepares initial form values from API record
 */
export function prepareInitialValues(
	record?: AuthtypesGettableAuthDomainDTO,
): FormValues {
	if (!record) {
		return {
			name: '',
			ssoEnabled: false,
			ssoType: '',
		};
	}

	return {
		...record,
		googleAuthConfig: record.googleAuthConfig
			? {
					...record.googleAuthConfig,
					domainToAdminEmailList: convertDomainMappingsToList(
						record.googleAuthConfig.domainToAdminEmail,
					),
			  }
			: undefined,
		roleMapping: record.roleMapping
			? {
					...record.roleMapping,
					groupMappingsList: convertGroupMappingsToList(
						record.roleMapping.groupMappings,
					),
			  }
			: undefined,
	};
}

import {
	AuthtypesAuthDomainConfigDTO,
	AuthtypesAuthDomainConfigGoogleDTOKind,
	AuthtypesAuthDomainConfigOIDCDTOKind,
	AuthtypesAuthDomainConfigSAMLDTOKind,
	AuthtypesAuthNProviderDTO,
	AuthtypesGettableAuthDomainDTO,
	AuthtypesGoogleConfigDTO,
	AuthtypesOIDCConfigDTO,
	AuthtypesRoleMappingDTO,
	AuthtypesSamlConfigDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Maps the config envelope's per-variant kind to the provider enum driving the
 * create/edit UI.
 */
export function kindToProvider(
	kind?: AuthtypesAuthDomainConfigDTO['kind'],
): AuthtypesAuthNProviderDTO | '' {
	switch (kind) {
		case AuthtypesAuthDomainConfigSAMLDTOKind.saml:
			return AuthtypesAuthNProviderDTO.saml;
		case AuthtypesAuthDomainConfigGoogleDTOKind.google:
			return AuthtypesAuthNProviderDTO.google;
		case AuthtypesAuthDomainConfigOIDCDTOKind.oidc:
			return AuthtypesAuthNProviderDTO.oidc;
		default:
			return '';
	}
}

// Form values interface for internal use (includes array-based fields for UI)
export interface FormValues {
	name?: string;
	enabled?: boolean;
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
			enabled: false,
		};
	}

	const { config } = record;
	return {
		name: record.name,
		enabled: record.enabled,
		samlConfig:
			config?.kind === AuthtypesAuthDomainConfigSAMLDTOKind.saml
				? config.spec
				: undefined,
		oidcConfig:
			config?.kind === AuthtypesAuthDomainConfigOIDCDTOKind.oidc
				? config.spec
				: undefined,
		googleAuthConfig:
			config?.kind === AuthtypesAuthDomainConfigGoogleDTOKind.google
				? {
						...config.spec,
						domainToAdminEmailList: convertDomainMappingsToList(
							config.spec.domainToAdminEmail,
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

/**
 * Prepares Google Auth config for API payload
 */
export function prepareGoogleAuthConfig(
	values: FormValues,
): AuthtypesGoogleConfigDTO | undefined {
	const config = values.googleAuthConfig;
	if (!config) {
		return undefined;
	}

	const {
		domainToAdminEmailList,
		allowedGroups,
		serviceAccountJson,
		domainToAdminEmail: _domainToAdminEmail,
		fetchTransitiveGroupMembership,
		...rest
	} = config;
	const domainToAdminEmail = convertDomainMappingsToRecord(
		domainToAdminEmailList,
	);

	return {
		...rest,
		...(rest.fetchGroups
			? {
					allowedGroups,
					serviceAccountJson,
					domainToAdminEmail: domainToAdminEmail ?? {},
					fetchTransitiveGroupMembership,
				}
			: { domainToAdminEmail: {} }),
	};
}

/**
 * Prepares role mapping for API payload; only returned when there is
 * meaningful content.
 */
export function prepareRoleMapping(
	values: FormValues,
): AuthtypesRoleMappingDTO | undefined {
	const roleMapping = values.roleMapping;
	if (!roleMapping) {
		return undefined;
	}

	const { groupMappingsList, ...rest } = roleMapping;
	const groupMappings = convertGroupMappingsToRecord(groupMappingsList);

	const hasDefaultRole = !!rest.defaultRole;
	const hasUseRoleAttribute = rest.useRoleAttribute === true;
	const hasGroupMappings =
		groupMappings && Object.keys(groupMappings).length > 0;

	if (!hasDefaultRole && !hasUseRoleAttribute && !hasGroupMappings) {
		return undefined;
	}

	return {
		...rest,
		groupMappings: rest.useRoleAttribute ? undefined : (groupMappings ?? {}),
	};
}

/**
 * Prepares the kind/spec config envelope for API payload; the inverse of
 * prepareInitialValues.
 */
export function prepareConfig(
	values: FormValues,
	provider: AuthtypesAuthNProviderDTO | '',
): AuthtypesAuthDomainConfigDTO | undefined {
	switch (provider) {
		case AuthtypesAuthNProviderDTO.saml:
			return values.samlConfig
				? {
						kind: AuthtypesAuthDomainConfigSAMLDTOKind.saml,
						spec: values.samlConfig,
					}
				: undefined;
		case AuthtypesAuthNProviderDTO.google: {
			const spec = prepareGoogleAuthConfig(values);
			return spec
				? {
						kind: AuthtypesAuthDomainConfigGoogleDTOKind.google,
						spec,
					}
				: undefined;
		}
		case AuthtypesAuthNProviderDTO.oidc:
			return values.oidcConfig
				? {
						kind: AuthtypesAuthDomainConfigOIDCDTOKind.oidc,
						spec: values.oidcConfig,
					}
				: undefined;
		default:
			return undefined;
	}
}

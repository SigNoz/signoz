/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	AuthtypesAuthDomainConfigDTO,
	AuthtypesGettableAuthDomainDTO,
	GetMyOrganization200,
	ListAuthDomains200,
} from 'api/generated/services/sigNoz.schemas';
import {
	AuthtypesAuthDomainConfigGoogleDTOKind,
	AuthtypesAuthDomainConfigOIDCDTOKind,
	AuthtypesAuthDomainConfigSAMLDTOKind,
} from 'api/generated/services/sigNoz.schemas';

export const AUTHN_PROVIDERS = ['saml', 'google', 'oidc'] as const;

export type AuthnProvider = (typeof AUTHN_PROVIDERS)[number];

export const DOMAIN_MAX = 4;

const DOMAIN_NAMES = [
	'nightswatch.io',
	'nightswatch-labs.io',
	'contractors.nightswatch.io',
	'acquired-team.dev',
];

const CREATED_AT = Date.UTC(2026, 0, 8, 11, 15);

const configFor = (provider: AuthnProvider): AuthtypesAuthDomainConfigDTO => {
	switch (provider) {
		case 'google':
			return {
				kind: AuthtypesAuthDomainConfigGoogleDTOKind.google,
				spec: {
					clientId: '918273645-storybook.apps.googleusercontent.com',
					clientSecret: 'GOCSPX-storybook-secret',
					fetchGroups: true,
					allowedGroups: ['engineering@nightswatch.io'],
				},
			};

		case 'oidc':
			return {
				kind: AuthtypesAuthDomainConfigOIDCDTOKind.oidc,
				spec: {
					clientId: 'signoz-console',
					clientSecret: 'storybook-oidc-secret',
					issuer: 'https://id.nightswatch.io',
					getUserInfo: true,
				},
			};

		default:
			return {
				kind: AuthtypesAuthDomainConfigSAMLDTOKind.saml,
				spec: {
					entityId: 'https://id.nightswatch.io/saml/metadata',
					location: 'https://id.nightswatch.io/saml/sso',
					certificate:
						'-----BEGIN CERTIFICATE-----\nMIIDazCCAlOgAwIBAgIUStorybookOnly\n-----END CERTIFICATE-----',
				},
			};
	}
};

/**
 * Only SAML and OIDC carry an IdP-initiated entry point, so the Google row is
 * the one that reports N/A in that column.
 */
const relayStatePath = (provider: AuthnProvider): string | null =>
	provider === 'google' ? null : 'api/v1/complete/saml';

const authDomain = (
	index: number,
	provider: AuthnProvider,
	enforced: boolean,
): AuthtypesGettableAuthDomainDTO => ({
	id: `auth-domain-${index}`,
	name: DOMAIN_NAMES[index] ?? `domain-${index}.io`,
	orgId: 'story-org',
	enabled: enforced,
	config: configFor(provider),
	authNProviderInfo: { relayStatePath: relayStatePath(provider) },
	roleMapping: { defaultRole: 'viewer', useRoleAttribute: false },
	createdAt: new Date(CREATED_AT).toISOString(),
	updatedAt: new Date(CREATED_AT).toISOString(),
});

export const authDomainsResponse = (
	domains: number,
	provider: AuthnProvider,
	enforced: boolean,
): ListAuthDomains200 => ({
	status: 'success',
	data: Array.from({ length: domains }, (_, index) =>
		authDomain(index, provider, enforced),
	),
});

export const myOrganizationResponse = (): GetMyOrganization200 => ({
	status: 'success',
	data: {
		id: 'does-not-matter-id',
		name: 'nightswatch',
		displayName: 'Pentagon',
		alias: 'nightswatch',
		createdAt: new Date(CREATED_AT).toISOString(),
		updatedAt: new Date(CREATED_AT).toISOString(),
	},
});

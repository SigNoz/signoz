import { AuthtypesAuthNProviderDTO } from 'api/generated/services/sigNoz.schemas';

import {
	convertDomainMappingsToList,
	convertDomainMappingsToRecord,
	convertGroupMappingsToList,
	convertGroupMappingsToRecord,
	prepareInitialValues,
} from './CreateEdit.utils';

describe('convertGroupMappingsToRecord', () => {
	it('returns undefined for an empty list', () => {
		expect(convertGroupMappingsToRecord([])).toBeUndefined();
	});

	it('returns undefined when input is undefined', () => {
		expect(convertGroupMappingsToRecord(undefined)).toBeUndefined();
	});

	it('converts entries to a Record', () => {
		expect(
			convertGroupMappingsToRecord([
				{ groupName: 'admins', role: 'ADMIN' },
				{ groupName: 'viewers', role: 'VIEWER' },
			]),
		).toStrictEqual({ admins: 'ADMIN', viewers: 'VIEWER' });
	});

	it('skips entries with missing groupName or role', () => {
		expect(
			convertGroupMappingsToRecord([
				{ groupName: 'admins', role: 'ADMIN' },
				{ groupName: '', role: 'VIEWER' },
				{ role: 'EDITOR' },
			]),
		).toStrictEqual({ admins: 'ADMIN' });
	});
});

describe('convertDomainMappingsToRecord', () => {
	it('returns undefined for an empty list', () => {
		expect(convertDomainMappingsToRecord([])).toBeUndefined();
	});

	it('returns undefined when input is undefined', () => {
		expect(convertDomainMappingsToRecord(undefined)).toBeUndefined();
	});

	it('converts entries to a Record', () => {
		expect(
			convertDomainMappingsToRecord([
				{ domain: 'example.com', adminEmail: 'admin@example.com' },
				{ domain: 'corp.io', adminEmail: 'it@corp.io' },
			]),
		).toStrictEqual({
			'example.com': 'admin@example.com',
			'corp.io': 'it@corp.io',
		});
	});
});

describe('round-trip fidelity', () => {
	it('Record → list → Record preserves group mappings', () => {
		const original = { admins: 'ADMIN', devs: 'EDITOR', viewers: 'VIEWER' };
		expect(
			convertGroupMappingsToRecord(convertGroupMappingsToList(original)),
		).toStrictEqual(original);
	});

	it('Record → list → Record preserves domain mappings', () => {
		const original = {
			'example.com': 'admin@example.com',
			'corp.io': 'it@corp.io',
		};
		expect(
			convertDomainMappingsToRecord(convertDomainMappingsToList(original)),
		).toStrictEqual(original);
	});
});

describe('prepareInitialValues', () => {
	it('returns empty defaults when no record is provided', () => {
		expect(prepareInitialValues(undefined)).toStrictEqual({
			name: '',
			ssoEnabled: false,
			ssoType: '',
		});
	});

	it('hydrates groupMappings Record into groupMappingsList for the form', () => {
		const result = prepareInitialValues({
			id: 'domain-1',
			name: 'example.com',
			config: {
				ssoEnabled: true,
				ssoType: AuthtypesAuthNProviderDTO.saml,
				roleMapping: {
					defaultRole: 'VIEWER',
					useRoleAttribute: false,
					groupMappings: { admins: 'ADMIN', viewers: 'VIEWER' },
				},
			},
		});

		expect(result.roleMapping?.groupMappingsList).toStrictEqual([
			{ groupName: 'admins', role: 'ADMIN' },
			{ groupName: 'viewers', role: 'VIEWER' },
		]);
	});

	it('hydrates domainToAdminEmail Record into domainToAdminEmailList for the form', () => {
		const result = prepareInitialValues({
			id: 'domain-1',
			name: 'example.com',
			config: {
				ssoEnabled: true,
				ssoType: AuthtypesAuthNProviderDTO.google_auth,
				googleAuthConfig: {
					clientId: 'id',
					clientSecret: 'secret',
					domainToAdminEmail: { 'example.com': 'admin@example.com' },
				},
			},
		});

		expect(result.googleAuthConfig?.domainToAdminEmailList).toStrictEqual([
			{ domain: 'example.com', adminEmail: 'admin@example.com' },
		]);
	});

	it('sets groupMappingsList to empty array when roleMapping has no groupMappings', () => {
		const result = prepareInitialValues({
			id: 'domain-1',
			name: 'example.com',
			config: {
				ssoEnabled: true,
				ssoType: AuthtypesAuthNProviderDTO.oidc,
				roleMapping: { defaultRole: 'VIEWER', useRoleAttribute: true },
			},
		});

		expect(result.roleMapping?.groupMappingsList).toStrictEqual([]);
	});
});

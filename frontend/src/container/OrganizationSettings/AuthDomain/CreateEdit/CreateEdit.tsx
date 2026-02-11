import { useMemo, useState } from 'react';
import { Button, Form, Modal } from 'antd';
import put from 'api/v1/domains/id/put';
import post from 'api/v1/domains/post';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import {
	GettableAuthDomain,
	GoogleAuthConfig,
	RoleMapping,
} from 'types/api/v1/domains/list';
import { PostableAuthDomain } from 'types/api/v1/domains/post';

import AuthnProviderSelector from './AuthnProviderSelector';
import ConfigureGoogleAuthAuthnProvider from './Providers/AuthnGoogleAuth';
import ConfigureOIDCAuthnProvider from './Providers/AuthnOIDC';
import ConfigureSAMLAuthnProvider from './Providers/AuthnSAML';

import './CreateEdit.styles.scss';

interface GroupMappingItem {
	group: string;
	role: string;
}

interface DomainAdminEmailItem {
	domain: string;
	adminEmail: string;
}

// Convert groupMappings object to array format for form
function groupMappingsToList(
	groupMappings?: Record<string, string>,
): GroupMappingItem[] {
	if (!groupMappings) {
		return [];
	}
	return Object.entries(groupMappings).map(([group, role]) => ({
		group,
		role,
	}));
}

// Convert array format back to groupMappings object for API
function listToGroupMappings(
	list?: GroupMappingItem[],
): Record<string, string> {
	if (!list || list.length === 0) {
		return {};
	}
	return list.reduce<Record<string, string>>((acc, { group, role }) => {
		if (group && role) {
			acc[group] = role;
		}
		return acc;
	}, {});
}

// Convert domainToAdminEmail object to array format for form
function domainToAdminEmailToList(
	domainToAdminEmail?: Record<string, string>,
): DomainAdminEmailItem[] {
	if (!domainToAdminEmail) {
		return [];
	}
	return Object.entries(domainToAdminEmail).map(([domain, adminEmail]) => ({
		domain,
		adminEmail,
	}));
}

// Convert array format back to domainToAdminEmail object for API
function listToDomainToAdminEmail(
	list?: DomainAdminEmailItem[],
): Record<string, string> {
	if (!list || list.length === 0) {
		return {};
	}
	return list.reduce<Record<string, string>>((acc, { domain, adminEmail }) => {
		if (domain && adminEmail) {
			acc[domain] = adminEmail;
		}
		return acc;
	}, {});
}

// Build roleMapping object for API submission
function buildRoleMapping(formRoleMapping?: {
	defaultRole?: string;
	useRoleAttribute?: boolean;
	groupMappingsList?: GroupMappingItem[];
}): RoleMapping | undefined {
	if (!formRoleMapping) {
		return undefined;
	}

	const { defaultRole, useRoleAttribute, groupMappingsList } = formRoleMapping;
	const groupMappings = listToGroupMappings(groupMappingsList);

	// Only include roleMapping if there's actually something configured
	if (
		!defaultRole &&
		!useRoleAttribute &&
		Object.keys(groupMappings).length === 0
	) {
		return undefined;
	}

	return {
		defaultRole: defaultRole || '',
		useRoleAttribute: useRoleAttribute || false,
		groupMappings,
	};
}

// Build googleAuthConfig for API submission
function buildGoogleAuthConfig(formGoogleAuthConfig?: {
	clientId?: string;
	clientSecret?: string;
	redirectURI?: string;
	fetchGroups?: boolean;
	serviceAccountJson?: string;
	domainToAdminEmailList?: DomainAdminEmailItem[];
	fetchTransitiveGroupMembership?: boolean;
	allowedGroupsList?: string[];
	insecureSkipEmailVerified?: boolean;
}): GoogleAuthConfig | undefined {
	if (!formGoogleAuthConfig) {
		return undefined;
	}

	const {
		clientId,
		clientSecret,
		redirectURI,
		fetchGroups,
		serviceAccountJson,
		domainToAdminEmailList,
		fetchTransitiveGroupMembership,
		allowedGroupsList,
		insecureSkipEmailVerified,
	} = formGoogleAuthConfig;

	// Return undefined if required fields are missing
	if (!clientId || !clientSecret) {
		return undefined;
	}

	return {
		clientId,
		clientSecret,
		redirectURI: redirectURI || '',
		fetchGroups: fetchGroups || false,
		serviceAccountJson,
		domainToAdminEmail: listToDomainToAdminEmail(domainToAdminEmailList),
		fetchTransitiveGroupMembership,
		allowedGroups: allowedGroupsList,
		insecureSkipEmailVerified: insecureSkipEmailVerified || false,
	};
}
interface CreateOrEditProps {
	isCreate: boolean;
	onClose: () => void;
	record?: GettableAuthDomain;
}

function configureAuthnProvider(
	authnProvider: string,
	isCreate: boolean,
): JSX.Element {
	switch (authnProvider) {
		case 'saml':
			return <ConfigureSAMLAuthnProvider isCreate={isCreate} />;
		case 'google_auth':
			return <ConfigureGoogleAuthAuthnProvider isCreate={isCreate} />;
		case 'oidc':
			return <ConfigureOIDCAuthnProvider isCreate={isCreate} />;
		default:
			return <ConfigureGoogleAuthAuthnProvider isCreate={isCreate} />;
	}
}

function CreateOrEdit(props: CreateOrEditProps): JSX.Element {
	const { isCreate, record, onClose } = props;
	const [form] = Form.useForm<PostableAuthDomain>();
	const [authnProvider, setAuthnProvider] = useState<string>(
		record?.ssoType || '',
	);

	const { showErrorModal } = useErrorModal();
	const { featureFlags } = useAppContext();
	const samlEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	// Transform record for form initial values (convert objects to list format for forms)
	const initialValues = useMemo(() => {
		if (!record) {
			return {
				name: '',
				ssoEnabled: false,
				ssoType: '',
			};
		}

		return {
			...record,
			roleMapping: record.roleMapping
				? {
						defaultRole: record.roleMapping.defaultRole,
						useRoleAttribute: record.roleMapping.useRoleAttribute,
						groupMappingsList: groupMappingsToList(record.roleMapping.groupMappings),
				  }
				: undefined,
			googleAuthConfig: record.googleAuthConfig
				? {
						...record.googleAuthConfig,
						domainToAdminEmailList: domainToAdminEmailToList(
							record.googleAuthConfig.domainToAdminEmail,
						),
						allowedGroupsList: record.googleAuthConfig.allowedGroups,
				  }
				: undefined,
		};
	}, [record]);

	const onSubmitHandler = async (): Promise<void> => {
		const name = form.getFieldValue('name');
		const formGoogleAuthConfig = form.getFieldValue('googleAuthConfig');
		const samlConfig = form.getFieldValue('samlConfig');
		const oidcConfig = form.getFieldValue('oidcConfig');
		const formRoleMapping = form.getFieldValue('roleMapping');

		const googleAuthConfig = buildGoogleAuthConfig(formGoogleAuthConfig);
		const roleMapping = buildRoleMapping(formRoleMapping);

		try {
			if (isCreate) {
				await post({
					name,
					config: {
						ssoEnabled: true,
						ssoType: authnProvider,
						googleAuthConfig,
						samlConfig,
						oidcConfig,
						roleMapping,
					},
				});
			} else {
				await put({
					id: record?.id || '',
					config: {
						ssoEnabled: form.getFieldValue('ssoEnabled'),
						ssoType: authnProvider,
						googleAuthConfig,
						samlConfig,
						oidcConfig,
						roleMapping,
					},
				});
			}

			onClose();
		} catch (error) {
			showErrorModal(error as APIError);
		}
	};

	const onBackHandler = (): void => {
		setAuthnProvider('');
	};

	return (
		<Modal open footer={null} onCancel={onClose}>
			<Form
				name="auth-domain"
				initialValues={initialValues}
				form={form}
				layout="vertical"
			>
				{isCreate && authnProvider === '' && (
					<AuthnProviderSelector
						setAuthnProvider={setAuthnProvider}
						samlEnabled={samlEnabled}
					/>
				)}
				{authnProvider !== '' && (
					<div className="auth-domain-configure">
						{configureAuthnProvider(authnProvider, isCreate)}
						<section className="action-buttons">
							{isCreate && <Button onClick={onBackHandler}>Back</Button>}
							{!isCreate && <Button onClick={onClose}>Cancel</Button>}
							<Button onClick={onSubmitHandler} type="primary">
								Save Changes
							</Button>
						</section>
					</div>
				)}
			</Form>
		</Modal>
	);
}

CreateOrEdit.defaultProps = {
	record: null,
};

export default CreateOrEdit;

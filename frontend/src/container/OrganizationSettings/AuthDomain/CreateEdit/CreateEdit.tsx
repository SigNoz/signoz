import { useCallback, useState } from 'react';
import { Button, Form, Modal } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import {
	useCreateAuthDomain,
	useUpdateAuthDomain,
} from 'api/generated/services/authdomains';
import {
	AuthtypesGettableAuthDomainDTO,
	AuthtypesGoogleConfigDTO,
	AuthtypesOIDCConfigDTO,
	AuthtypesPostableAuthDomainDTO,
	AuthtypesRoleMappingDTO,
	AuthtypesSamlConfigDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { FeatureKeys } from 'constants/features';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import AuthnProviderSelector from './AuthnProviderSelector';
import ConfigureGoogleAuthAuthnProvider from './Providers/AuthnGoogleAuth';
import ConfigureOIDCAuthnProvider from './Providers/AuthnOIDC';
import ConfigureSAMLAuthnProvider from './Providers/AuthnSAML';

import './CreateEdit.styles.scss';

interface CreateOrEditProps {
	isCreate: boolean;
	onClose: () => void;
	record?: AuthtypesGettableAuthDomainDTO;
}

// Form values interface for internal use (includes array-based fields for UI)
interface FormValues {
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

/**
 * Converts groupMappingsList array to groupMappings Record for API
 */
function convertGroupMappingsToRecord(
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
function convertGroupMappingsToList(
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
function convertDomainMappingsToRecord(
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
function convertDomainMappingsToList(
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
function prepareInitialValues(
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

function CreateOrEdit(props: CreateOrEditProps): JSX.Element {
	const { isCreate, record, onClose } = props;
	const [form] = Form.useForm<AuthtypesPostableAuthDomainDTO>();
	const [authnProvider, setAuthnProvider] = useState<string>(
		record?.ssoType || '',
	);

	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();
	const { featureFlags } = useAppContext();

	const handleError = useCallback(
		(error: AxiosError<RenderErrorResponseDTO>): void => {
			try {
				ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
			} catch (apiError) {
				showErrorModal(apiError as APIError);
			}
		},
		[showErrorModal],
	);
	const samlEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const {
		mutate: createAuthDomain,
		isLoading: isCreating,
	} = useCreateAuthDomain<AxiosError<RenderErrorResponseDTO>>();

	const {
		mutate: updateAuthDomain,
		isLoading: isUpdating,
	} = useUpdateAuthDomain<AxiosError<RenderErrorResponseDTO>>();

	/**
	 * Prepares Google Auth config for API payload
	 */
	const getGoogleAuthConfig = useCallback(():
		| AuthtypesGoogleConfigDTO
		| undefined => {
		const config = form.getFieldValue('googleAuthConfig');
		if (!config) {
			return undefined;
		}

		const { domainToAdminEmailList, ...rest } = config;
		const domainToAdminEmail = convertDomainMappingsToRecord(
			domainToAdminEmailList,
		);

		return {
			...rest,
			...(domainToAdminEmail && { domainToAdminEmail }),
		};
	}, [form]);

	/**
	 * Prepares role mapping for API payload
	 */
	const getRoleMapping = useCallback((): AuthtypesRoleMappingDTO | undefined => {
		const roleMapping = form.getFieldValue('roleMapping');
		if (!roleMapping) {
			return undefined;
		}

		const { groupMappingsList, ...rest } = roleMapping;
		const groupMappings = convertGroupMappingsToRecord(groupMappingsList);

		// Only return roleMapping if there's meaningful content
		const hasDefaultRole = !!rest.defaultRole;
		const hasUseRoleAttribute = rest.useRoleAttribute === true;
		const hasGroupMappings =
			groupMappings && Object.keys(groupMappings).length > 0;

		if (!hasDefaultRole && !hasUseRoleAttribute && !hasGroupMappings) {
			return undefined;
		}

		return {
			...rest,
			...(groupMappings && { groupMappings }),
		};
	}, [form]);

	const onSubmitHandler = useCallback(async (): Promise<void> => {
		try {
			await form.validateFields();
		} catch {
			return;
		}

		const name = form.getFieldValue('name');
		const googleAuthConfig = getGoogleAuthConfig();
		const samlConfig = form.getFieldValue('samlConfig');
		const oidcConfig = form.getFieldValue('oidcConfig');
		const roleMapping = getRoleMapping();

		if (isCreate) {
			createAuthDomain(
				{
					data: {
						name,
						config: {
							ssoEnabled: true,
							ssoType: authnProvider,
							googleAuthConfig,
							samlConfig,
							oidcConfig,
							roleMapping,
						},
					},
				},
				{
					onSuccess: () => {
						notifications.success({
							message: 'Domain created successfully',
						});
						onClose();
					},
					onError: handleError,
				},
			);
		} else {
			if (!record?.id) {
				return;
			}

			updateAuthDomain(
				{
					pathParams: { id: record.id },
					data: {
						config: {
							ssoEnabled: form.getFieldValue('ssoEnabled'),
							ssoType: authnProvider,
							googleAuthConfig,
							samlConfig,
							oidcConfig,
							roleMapping,
						},
					},
				},
				{
					onSuccess: () => {
						notifications.success({
							message: 'Domain updated successfully',
						});
						onClose();
					},
					onError: handleError,
				},
			);
		}
	}, [
		authnProvider,
		createAuthDomain,
		form,
		getGoogleAuthConfig,
		getRoleMapping,
		handleError,
		isCreate,
		notifications,
		onClose,
		record,
		updateAuthDomain,
	]);

	const onBackHandler = useCallback((): void => {
		form.resetFields();
		setAuthnProvider('');
	}, [form]);

	return (
		<Modal
			open
			footer={null}
			onCancel={onClose}
			width={authnProvider ? 980 : undefined}
		>
			<Form
				name="auth-domain"
				initialValues={defaultTo(prepareInitialValues(record), {
					name: '',
					ssoEnabled: false,
					ssoType: '',
				})}
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
							<Button
								onClick={onSubmitHandler}
								type="primary"
								loading={isCreating || isUpdating}
							>
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

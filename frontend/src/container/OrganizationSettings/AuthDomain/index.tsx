import { useCallback, useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from '@signozhq/button';
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import {
	useDeleteAuthDomain,
	useListAuthDomains,
} from 'api/generated/services/authdomains';
import {
	AuthtypesGettableAuthDomainDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import { useNotifications } from 'hooks/useNotifications';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import CreateEdit from './CreateEdit/CreateEdit';
import Toggle from './Toggle';

import './AuthDomain.styles.scss';

export const SSOType = new Map<string, string>([
	['google_auth', 'Google Auth'],
	['saml', 'SAML'],
	['email_password', 'Email Password'],
	['oidc', 'OIDC'],
]);

function AuthDomain(): JSX.Element {
	const [record, setRecord] = useState<AuthtypesGettableAuthDomainDTO>();
	const [addDomain, setAddDomain] = useState<boolean>(false);
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();

	const {
		data: authDomainListResponse,
		isLoading: isLoadingAuthDomainListResponse,
		isFetching: isFetchingAuthDomainListResponse,
		error: errorFetchingAuthDomainListResponse,
		refetch: refetchAuthDomainListResponse,
	} = useListAuthDomains();

	const { mutate: deleteAuthDomain } = useDeleteAuthDomain<
		AxiosError<RenderErrorResponseDTO>
	>();

	const handleDeleteDomain = useCallback(
		(id: string): void => {
			deleteAuthDomain(
				{ pathParams: { id } },
				{
					onSuccess: () => {
						notifications.success({
							message: 'Domain deleted successfully',
						});
						refetchAuthDomainListResponse();
					},
					onError: (error) => {
						try {
							ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
						} catch (apiError) {
							showErrorModal(apiError as APIError);
						}
					},
				},
			);
		},
		[
			deleteAuthDomain,
			notifications,
			refetchAuthDomainListResponse,
			showErrorModal,
		],
	);

	const formattedError = useMemo(() => {
		if (!errorFetchingAuthDomainListResponse) {
			return null;
		}

		let errorResult: APIError | null = null;
		try {
			ErrorResponseHandlerV2(
				errorFetchingAuthDomainListResponse as AxiosError<ErrorV2Resp>,
			);
		} catch (error) {
			errorResult = error as APIError;
		}
		return errorResult;
	}, [errorFetchingAuthDomainListResponse]);

	const columns: ColumnsType<AuthtypesGettableAuthDomainDTO> = useMemo(
		() => [
			{
				title: 'Domain',
				dataIndex: 'name',
				key: 'name',
				width: 100,
				render: (val): JSX.Element => <span>{val}</span>,
			},
			{
				title: 'Enforce SSO',
				dataIndex: 'ssoEnabled',
				key: 'ssoEnabled',
				width: 80,
				render: (
					value: boolean,
					record: AuthtypesGettableAuthDomainDTO,
				): JSX.Element => <Toggle isDefaultChecked={value} record={record} />,
			},
			{
				title: 'IDP Initiated SSO URL',
				dataIndex: 'relayState',
				key: 'relayState',
				width: 80,
				render: (_, record: AuthtypesGettableAuthDomainDTO): JSX.Element => {
					const relayPath = record.authNProviderInfo?.relayStatePath;
					if (!relayPath) {
						return <span className="auth-domain-list-na">N/A</span>;
					}

					const href = `${window.location.origin}/${relayPath}`;
					return <CopyToClipboard textToCopy={href} />;
				},
			},
			{
				title: 'Action',
				dataIndex: 'action',
				key: 'action',
				width: 100,
				render: (_, record: AuthtypesGettableAuthDomainDTO): JSX.Element => (
					<section className="auth-domain-list-column-action">
						<Button
							className="auth-domain-list-action-link"
							onClick={(): void => setRecord(record)}
							variant="link"
						>
							Configure {SSOType.get(record.ssoType || '')}
						</Button>
						<Button
							className="auth-domain-list-action-link delete"
							onClick={(): void => {
								if (record.id) {
									handleDeleteDomain(record.id);
								}
							}}
							variant="link"
						>
							Delete
						</Button>
					</section>
				),
			},
		],
		[handleDeleteDomain],
	);

	return (
		<div className="auth-domain">
			<section className="auth-domain-header">
				<h3 className="auth-domain-title">Authenticated Domains</h3>
				<Button
					prefixIcon={<PlusOutlined />}
					onClick={(): void => {
						setAddDomain(true);
					}}
					variant="solid"
					size="sm"
					color="primary"
				>
					Add Domain
				</Button>
			</section>
			{formattedError && <ErrorContent error={formattedError} />}
			{!errorFetchingAuthDomainListResponse && (
				<Table
					columns={columns}
					dataSource={authDomainListResponse?.data?.data}
					onRow={undefined}
					loading={
						isLoadingAuthDomainListResponse || isFetchingAuthDomainListResponse
					}
					className="auth-domain-list"
				/>
			)}
			{(addDomain || record) && (
				<CreateEdit
					isCreate={!record}
					record={record}
					onClose={(): void => {
						setAddDomain(false);
						setRecord(undefined);
						refetchAuthDomainListResponse();
					}}
				/>
			)}
		</div>
	);
}

export default AuthDomain;

import { useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from '@signozhq/button';
import { Table, Typography } from 'antd';
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

const columns: ColumnsType<AuthtypesGettableAuthDomainDTO> = [
	{
		title: 'Domain',
		dataIndex: 'name',
		key: 'name',
		width: 100,
		render: (val): JSX.Element => <Typography.Text>{val}</Typography.Text>,
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
				return (
					<Typography.Text style={{ paddingLeft: '6px' }}>N/A</Typography.Text>
				);
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
				<Typography.Link data-column-action="configure">
					Configure {SSOType.get(record.ssoType || '')}
				</Typography.Link>
				<Typography.Link type="danger" data-column-action="delete">
					Delete
				</Typography.Link>
			</section>
		),
	},
];

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

	const handleDeleteDomain = (id: string): void => {
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
	};

	const formattedError = useMemo(() => {
		if (!errorFetchingAuthDomainListResponse) {
			return null;
		}

		try {
			ErrorResponseHandlerV2(
				errorFetchingAuthDomainListResponse as AxiosError<ErrorV2Resp>,
			);
		} catch (error) {
			return error as APIError;
		}
	}, [errorFetchingAuthDomainListResponse]);

	return (
		<div className="auth-domain">
			<section className="auth-domain-header">
				<Typography.Title level={3}>Authenticated Domains</Typography.Title>
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
					onRow={(tableRecord): any => ({
						onClick: (
							event: React.SyntheticEvent<HTMLLinkElement, MouseEvent>,
						): void => {
							const target = event.target as HTMLLinkElement;
							const { columnAction } = target.dataset;
							switch (columnAction) {
								case 'configure':
									setRecord(tableRecord);
									break;
								case 'delete':
									if (tableRecord.id) {
										handleDeleteDomain(tableRecord.id);
									}
									break;
								default:
									console.error('Unknown action:', columnAction);
							}
						},
					})}
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

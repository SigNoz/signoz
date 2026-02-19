import { useCallback, useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from '@signozhq/button';
import { Trash2, X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Modal } from 'antd';
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
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import CreateEdit from './CreateEdit/CreateEdit';
import SSOEnforcementToggle from './SSOEnforcementToggle';

import './AuthDomain.styles.scss';
import '../../IngestionSettings/IngestionSettings.styles.scss';

export const SSOType = new Map<string, string>([
	['google_auth', 'Google Auth'],
	['saml', 'SAML'],
	['email_password', 'Email Password'],
	['oidc', 'OIDC'],
]);

function AuthDomain(): JSX.Element {
	const [record, setRecord] = useState<AuthtypesGettableAuthDomainDTO>();
	const [addDomain, setAddDomain] = useState<boolean>(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [
		activeDomain,
		setActiveDomain,
	] = useState<AuthtypesGettableAuthDomainDTO | null>(null);

	const { showErrorModal } = useErrorModal();

	const {
		data: authDomainListResponse,
		isLoading: isLoadingAuthDomainListResponse,
		isFetching: isFetchingAuthDomainListResponse,
		error: errorFetchingAuthDomainListResponse,
		refetch: refetchAuthDomainListResponse,
	} = useListAuthDomains();

	const { mutate: deleteAuthDomain, isLoading } = useDeleteAuthDomain<
		AxiosError<RenderErrorResponseDTO>
	>();

	const showDeleteModal = useCallback(
		(domain: AuthtypesGettableAuthDomainDTO): void => {
			setActiveDomain(domain);
			setIsDeleteModalOpen(true);
		},
		[],
	);

	const hideDeleteModal = useCallback((): void => {
		setIsDeleteModalOpen(false);
		setActiveDomain(null);
	}, []);

	const handleDeleteDomain = useCallback((): void => {
		if (!activeDomain?.id) {
			return;
		}

		deleteAuthDomain(
			{ pathParams: { id: activeDomain.id } },
			{
				onSuccess: () => {
					toast.success('Domain deleted successfully');
					refetchAuthDomainListResponse();
					hideDeleteModal();
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
	}, [
		activeDomain,
		deleteAuthDomain,
		hideDeleteModal,

		refetchAuthDomainListResponse,
		showErrorModal,
	]);

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
				): JSX.Element => (
					<SSOEnforcementToggle isDefaultChecked={value} record={record} />
				),
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
							onClick={(): void => showDeleteModal(record)}
							variant="link"
						>
							Delete
						</Button>
					</section>
				),
			},
		],
		[showDeleteModal],
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
					rowKey="id"
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

			<Modal
				className="delete-ingestion-key-modal"
				title={<span className="title">Delete Domain</span>}
				open={isDeleteModalOpen}
				closable
				onCancel={hideDeleteModal}
				destroyOnClose
				footer={[
					<Button
						key="cancel"
						onClick={hideDeleteModal}
						className="cancel-btn"
						prefixIcon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						key="submit"
						prefixIcon={<Trash2 size={16} />}
						onClick={handleDeleteDomain}
						className="delete-btn"
						loading={isLoading}
					>
						Delete Domain
					</Button>,
				]}
			>
				<p className="delete-text">
					Are you sure you want to delete the domain{' '}
					<strong>{activeDomain?.name}</strong>? This action cannot be undone.
				</p>
			</Modal>
		</div>
	);
}

export default AuthDomain;

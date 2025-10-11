import './AuthDomain.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteDomain from 'api/v1/domains/id/delete';
import listAllDomain from 'api/v1/domains/list';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useState } from 'react';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';
import { GettableAuthDomain, SSOType } from 'types/api/v1/domains/list';

import CreateEdit from './CreateEdit/CreateEdit';
import Toggle from './Toggle';

const columns: ColumnsType<GettableAuthDomain> = [
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
		render: (value: boolean, record: GettableAuthDomain): JSX.Element => (
			<Toggle isDefaultChecked={value} record={record} />
		),
	},
	{
		title: 'Action',
		dataIndex: 'action',
		key: 'action',
		width: 100,
		render: (_, record: GettableAuthDomain): JSX.Element => (
			<section className="auth-domain-list-column-action">
				<Typography.Link data-column-action="configure">
					Configure {SSOType.get(record.ssoType)}
				</Typography.Link>
				<Typography.Link type="danger" data-column-action="delete">
					Delete
				</Typography.Link>
			</section>
		),
	},
];

async function deleteDomainById(
	id: string,
	showErrorModal: (error: APIError) => void,
	refetchAuthDomainListResponse: () => void,
): Promise<void> {
	try {
		await deleteDomain(id);
		refetchAuthDomainListResponse();
	} catch (error) {
		showErrorModal(error as APIError);
	}
}

function AuthDomain(): JSX.Element {
	const [record, setRecord] = useState<GettableAuthDomain>();
	const [addDomain, setAddDomain] = useState<boolean>(false);
	const { showErrorModal } = useErrorModal();
	const {
		data: authDomainListResponse,
		isLoading: isLoadingAuthDomainListResponse,
		isFetching: isFetchingAuthDomainListResponse,
		error: errorFetchingAuthDomainListResponse,
		refetch: refetchAuthDomainListResponse,
	} = useQuery({
		queryFn: listAllDomain,
		queryKey: ['/api/v1/domains', 'list'],
		enabled: true,
	});

	return (
		<div className="auth-domain">
			<section className="auth-domain-header">
				<Typography.Title level={3}>Authenticated Domains</Typography.Title>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={(): void => {
						setAddDomain(true);
					}}
					className="button"
				>
					Add Domain
				</Button>
			</section>
			{(errorFetchingAuthDomainListResponse as APIError) && (
				<ErrorContent error={errorFetchingAuthDomainListResponse as APIError} />
			)}
			{!(errorFetchingAuthDomainListResponse as APIError) && (
				<Table
					columns={columns}
					dataSource={authDomainListResponse?.data}
					onRow={(record): any => ({
						onClick: (
							event: React.SyntheticEvent<HTMLLinkElement, MouseEvent>,
						): void => {
							const target = event.target as HTMLLinkElement;
							const { columnAction } = target.dataset;
							switch (columnAction) {
								case 'configure':
									setRecord(record);

									break;
								case 'delete':
									deleteDomainById(
										record.id,
										showErrorModal,
										refetchAuthDomainListResponse,
									);
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

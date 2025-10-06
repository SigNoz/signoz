import './AuthDomain.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Skeleton, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteDomain from 'api/v1/domains/delete';
import listAllDomain from 'api/v1/domains/list';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useState } from 'react';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';
import { GettableAuthDomain, SSOType } from 'types/api/v1/domains/list';

import CreateOrEdit from './CreateOrEdit';
import SwitchComponent from './Switch';

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
			<SwitchComponent isDefaultChecked={value} record={record} />
		),
	},
	{
		title: 'Action',
		dataIndex: 'action',
		key: 'action',
		width: 100,
		render: (_, record: GettableAuthDomain): JSX.Element => (
			<div>
				<Typography.Link data-column-action="configure">
					Configure {SSOType.get(record.ssoType)}
				</Typography.Link>
				<Typography.Link type="danger" data-column-action="delete">
					Delete
				</Typography.Link>
			</div>
		),
	},
];

// TODO check why is the error modal breaking here
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
		refetch: refetchAuthDomainListResponse,
	} = useQuery({
		queryFn: listAllDomain,
		queryKey: ['/api/v1/domains', 'list'],
		enabled: true,
	});

	return (
		<div>
			<section>
				<Typography.Text>Authenticated Domains</Typography.Text>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={(): void => setAddDomain(true)}
				>
					Add Domain
				</Button>
			</section>
			{(isLoadingAuthDomainListResponse || isFetchingAuthDomainListResponse) && (
				<>
					<Skeleton active paragraph={{ rows: 2 }} />
					<Skeleton active paragraph={{ rows: 2 }} />
				</>
			)}
			{authDomainListResponse && (
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
				<CreateOrEdit
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

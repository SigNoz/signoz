import { Button, Modal, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteDomain from 'api/v1/domains/delete';
import listAllDomain from 'api/v1/domains/list';
import updateDomain from 'api/v1/domains/update';
import { ResizeTable } from 'components/ResizeTable';
import TextToolTip from 'components/TextToolTip';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';
import { AuthDomain } from 'types/api/SAML/listDomain';
import { v4 } from 'uuid';

import AddDomain from './AddDomain';
import Create from './Create';
import EditSSO from './Edit';
import { ConfigureSsoButtonText, EditModalTitleText } from './helpers';
import { ColumnWithTooltip } from './styles';
import SwitchComponent from './Switch';

function AuthDomains(): JSX.Element {
	const { t } = useTranslation(['common', 'organizationsettings']);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
	const { org } = useAppContext();
	const [currentDomain, setCurrentDomain] = useState<AuthDomain>();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const { data, isLoading, refetch } = useQuery(['saml'], {
		queryFn: () => listAllDomain(),
		enabled: org !== null,
	});

	const { notifications } = useNotifications();

	const assignSsoMethod = useCallback(
		(typ: AuthDomain['ssoType']): void => {
			setCurrentDomain({ ...currentDomain, ssoType: typ } as AuthDomain);
		},
		[currentDomain, setCurrentDomain],
	);

	const onCloseHandler = useCallback(
		(func: Dispatch<SetStateAction<boolean>>) => (): void => {
			func(false);
		},
		[],
	);

	const onRecordUpdateHandler = useCallback(
		async (record: AuthDomain): Promise<boolean> => {
			try {
				await updateDomain(record);
				notifications.success({
					message: t('saml_settings', {
						ns: 'organizationsettings',
					}),
				});
				refetch();
				onCloseHandler(setIsEditModalOpen)();
				return true;
			} catch (error) {
				notifications.error({
					message: (error as APIError).getErrorCode(),
					description: (error as APIError).getErrorMessage(),
				});
				return false;
			}
		},
		[refetch, t, onCloseHandler, notifications],
	);

	const onOpenHandler = useCallback(
		(func: Dispatch<SetStateAction<boolean>>) => (): void => {
			func(true);
		},
		[],
	);

	const onEditHandler = useCallback(
		(record: AuthDomain) => (): void => {
			if (!record.ssoType) {
				onOpenHandler(setIsSettingsOpen)();
			} else {
				onOpenHandler(setIsEditModalOpen)();
			}

			setCurrentDomain(record);
		},
		[onOpenHandler],
	);

	const onDeleteHandler = useCallback(
		(record: AuthDomain) => (): void => {
			Modal.confirm({
				centered: true,
				title: t('delete_domain', {
					ns: 'organizationsettings',
				}),
				content: t('delete_domain_message', {
					ns: 'organizationsettings',
				}),
				onOk: async () => {
					try {
						await deleteDomain({
							...record,
						});

						notifications.success({
							message: t('common:success'),
						});
						refetch();
					} catch (error) {
						notifications.error({
							message: (error as APIError).getErrorCode(),
							description: (error as APIError).getErrorMessage(),
						});
					}
				},
			});
		},
		[refetch, t, notifications],
	);

	const columns: ColumnsType<AuthDomain> = [
		{
			title: 'Domain',
			dataIndex: 'name',
			key: 'name',
			width: 100,
		},
		{
			title: (
				<ColumnWithTooltip>
					<Typography>Enforce SSO</Typography>
					<TextToolTip
						{...{
							text: `When enabled, this option restricts users to SSO based authentication. For more information, click `,
							url: 'https://signoz.io/docs/userguide/sso-authentication/',
						}}
					/>{' '}
				</ColumnWithTooltip>
			),
			dataIndex: 'ssoEnabled',
			key: 'ssoEnabled',
			width: 80,
			render: (value: boolean, record: AuthDomain): JSX.Element => (
				<SwitchComponent
					onRecordUpdateHandler={onRecordUpdateHandler}
					isDefaultChecked={value}
					record={record}
				/>
			),
		},
		{
			title: '',
			dataIndex: 'description',
			key: 'description',
			width: 100,
			render: (_, record: AuthDomain): JSX.Element => (
				<Button type="link" onClick={onEditHandler(record)}>
					{ConfigureSsoButtonText(record.ssoType)}
				</Button>
			),
		},
		{
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
			width: 50,
			render: (_, record): JSX.Element => (
				<Button onClick={onDeleteHandler(record)} danger type="link">
					Delete
				</Button>
			),
		},
	];

	if (!isLoading && data?.data?.length === 0) {
		return (
			<Space direction="vertical" size="middle">
				<AddDomain refetch={refetch} />

				<Modal
					centered
					title="Configure Authentication Method"
					onCancel={onCloseHandler(setIsSettingsOpen)}
					destroyOnClose
					open={isSettingsOpen}
					footer={null}
				>
					<Create
						ssoMethod={currentDomain?.ssoType as AuthDomain['ssoType']}
						assignSsoMethod={assignSsoMethod}
						setIsEditModalOpen={setIsEditModalOpen}
						setIsSettingsOpen={setIsSettingsOpen}
					/>
				</Modal>
				<ResizeTable
					columns={columns}
					rowKey={(record: AuthDomain): string => record.name + v4()}
					dataSource={[]}
					tableLayout="fixed"
					bordered
				/>
			</Space>
		);
	}

	const tableData = data?.data || [];
	return (
		<>
			<Modal
				centered
				title="Configure Authentication Method"
				onCancel={onCloseHandler(setIsSettingsOpen)}
				destroyOnClose
				open={isSettingsOpen}
				footer={null}
			>
				<Create
					ssoMethod={currentDomain?.ssoType as AuthDomain['ssoType']}
					assignSsoMethod={assignSsoMethod}
					setIsSettingsOpen={setIsSettingsOpen}
					setIsEditModalOpen={setIsEditModalOpen}
				/>
			</Modal>

			<Modal
				open={isEditModalOpen}
				centered
				title={EditModalTitleText(currentDomain?.ssoType)}
				onCancel={onCloseHandler(setIsEditModalOpen)}
				destroyOnClose
				style={{ minWidth: '600px' }}
				footer={null}
			>
				<EditSSO
					onRecordUpdateHandler={onRecordUpdateHandler}
					record={currentDomain as AuthDomain}
					setEditModalOpen={setIsEditModalOpen}
				/>
			</Modal>

			<Space direction="vertical" size="middle">
				<AddDomain refetch={refetch} />

				<ResizeTable
					columns={columns}
					dataSource={tableData}
					loading={isLoading}
					tableLayout="fixed"
					rowKey={(record: AuthDomain): string => record.name + v4()}
					bordered
				/>
			</Space>
		</>
	);
}

export default AuthDomains;

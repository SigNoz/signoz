import { LockTwoTone } from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteDomain from 'api/SAML/deleteDomain';
import listAllDomain from 'api/SAML/listAllDomain';
import updateDomain from 'api/SAML/updateDomain';
import { ResizeTable } from 'components/ResizeTable';
import TextToolTip from 'components/TextToolTip';
import { SIGNOZ_UPGRADE_PLAN_URL } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
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
	const { org, featureFlags } = useAppContext();
	const [currentDomain, setCurrentDomain] = useState<AuthDomain>();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const SSOFlag =
		featureFlags?.find((flag) => flag.name === FeatureKeys.SSO)?.active || false;

	const notEntripriseData: AuthDomain[] = [
		{
			id: v4(),
			name: '',
			ssoEnabled: false,
			orgId: (org || [])[0].id || '',
			samlConfig: {
				samlCert: '',
				samlEntity: '',
				samlIdp: '',
			},
			ssoType: 'SAML',
		},
	];

	const { data, isLoading, refetch } = useQuery(['saml'], {
		queryFn: () =>
			listAllDomain({
				orgId: (org || [])[0].id,
			}),
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
				const response = await updateDomain(record);

				if (response.statusCode === 200) {
					notifications.success({
						message: t('saml_settings', {
							ns: 'organizationsettings',
						}),
					});
					refetch();
					onCloseHandler(setIsEditModalOpen)();

					return true;
				}

				notifications.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});

				return false;
			} catch (error) {
				notifications.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
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
					const response = await deleteDomain({
						...record,
					});

					if (response.statusCode === 200) {
						notifications.success({
							message: t('common:success'),
						});
						refetch();
					} else {
						notifications.error({
							message: t('common:something_went_wrong'),
						});
					}
				},
			});
		},
		[refetch, t, notifications],
	);

	const onClickLicenseHandler = useCallback(() => {
		window.open(SIGNOZ_UPGRADE_PLAN_URL);
	}, []);

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
			render: (value: boolean, record: AuthDomain): JSX.Element => {
				if (!SSOFlag) {
					return (
						<Button
							onClick={onClickLicenseHandler}
							type="link"
							icon={<LockTwoTone />}
						>
							Upgrade to Configure SSO
						</Button>
					);
				}

				return (
					<SwitchComponent
						onRecordUpdateHandler={onRecordUpdateHandler}
						isDefaultChecked={value}
						record={record}
					/>
				);
			},
		},
		{
			title: '',
			dataIndex: 'description',
			key: 'description',
			width: 100,
			render: (_, record: AuthDomain): JSX.Element => {
				if (!SSOFlag) {
					return (
						<Button
							onClick={onClickLicenseHandler}
							type="link"
							icon={<LockTwoTone />}
						>
							Upgrade to Configure SSO
						</Button>
					);
				}

				return (
					<Button type="link" onClick={onEditHandler(record)}>
						{ConfigureSsoButtonText(record.ssoType)}
					</Button>
				);
			},
		},
		{
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
			width: 50,
			render: (_, record): JSX.Element => (
				<Button
					disabled={!SSOFlag}
					onClick={onDeleteHandler(record)}
					danger
					type="link"
				>
					Delete
				</Button>
			),
		},
	];

	if (!isLoading && data?.payload?.length === 0) {
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
					dataSource={!SSOFlag ? notEntripriseData : []}
					tableLayout="fixed"
					bordered
				/>
			</Space>
		);
	}

	const tableData = SSOFlag ? data?.payload || [] : notEntripriseData;

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

import { LockTwoTone } from '@ant-design/icons';
import { Button, Modal, notification, Space, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import deleteDomain from 'api/SAML/deleteDomain';
import listAllDomain from 'api/SAML/listAllDomain';
import updateDomain from 'api/SAML/updateDomain';
import TextToolTip from 'components/TextToolTip';
import { SIGNOZ_UPGRADE_PLAN_URL } from 'constants/app';
import { FeatureKeys } from 'constants/featureKeys';
import useFeatureFlag from 'hooks/useFeatureFlag';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { AuthDomain } from 'types/api/SAML/listDomain';
import AppReducer from 'types/reducer/app';
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
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);
	const [currentDomain, setCurrentDomain] = useState<AuthDomain>();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const SSOFlag = useFeatureFlag(FeatureKeys.SSO);

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

	const assignSsoMethod = useCallback(
		(typ: AuthDomain['ssoType']): void => {
			setCurrentDomain({ ...currentDomain, ssoType: typ } as AuthDomain);
		},
		[currentDomain, setCurrentDomain],
	);

	const onCloseHandler = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => (): void => {
			func(false);
		},
		[],
	);

	const onRecordUpdateHandler = useCallback(
		async (record: AuthDomain): Promise<boolean> => {
			try {
				const response = await updateDomain(record);

				if (response.statusCode === 200) {
					notification.success({
						message: t('saml_settings', {
							ns: 'organizationsettings',
						}),
					});
					refetch();
					onCloseHandler(setIsEditModalOpen)();

					return true;
				}

				notification.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});

				return false;
			} catch (error) {
				notification.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});
				return false;
			}
		},
		[refetch, t, onCloseHandler],
	);

	const onOpenHandler = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => (): void => {
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
						notification.success({
							message: t('common:success'),
						});
						refetch();
					} else {
						notification.error({
							message: t('common:something_went_wrong'),
						});
					}
				},
			});
		},
		[refetch, t],
	);

	const onClickLicenseHandler = useCallback(() => {
		window.open(SIGNOZ_UPGRADE_PLAN_URL);
	}, []);

	const columns: ColumnsType<AuthDomain> = [
		{
			title: 'Domain',
			dataIndex: 'name',
			key: 'name',
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
			render: (_, record): JSX.Element => {
				return (
					<Button
						disabled={!SSOFlag}
						onClick={onDeleteHandler(record)}
						danger
						type="link"
					>
						Delete
					</Button>
				);
			},
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
					visible={isSettingsOpen}
					footer={null}
				>
					<Create
						ssoMethod={currentDomain?.ssoType as AuthDomain['ssoType']}
						assignSsoMethod={assignSsoMethod}
						setIsEditModalOpen={setIsEditModalOpen}
						setIsSettingsOpen={setIsSettingsOpen}
					/>
				</Modal>
				<Table
					rowKey={(record: AuthDomain): string => record.name + v4()}
					dataSource={!SSOFlag ? notEntripriseData : []}
					columns={columns}
					tableLayout="fixed"
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
				visible={isSettingsOpen}
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
				visible={isEditModalOpen}
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

				<Table
					dataSource={tableData}
					loading={isLoading}
					columns={columns}
					tableLayout="fixed"
					rowKey={(record: AuthDomain): string => record.name + v4()}
				/>
			</Space>
		</>
	);
}

export default AuthDomains;

import { green, orange } from '@ant-design/colors';
import {
	CheckCircleTwoTone,
	CloseCircleTwoTone,
	LockTwoTone,
	PlusOutlined,
} from '@ant-design/icons';
import { Button, Modal, notification, Space, Table, Typography } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { ColumnsType } from 'antd/lib/table';
import deleteDomain from 'api/SAML/deleteDomain';
import listAllDomain from 'api/SAML/listAllDomain';
import updateDomain from 'api/SAML/updateDomain';
import useFeatureFlag from 'hooks/getFeatureFlag';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SAMLDomain } from 'types/api/SAML/listDomain';
import AppReducer from 'types/reducer/app';
import { v4 } from 'uuid';

import Create from './Create';
import EditSaml, { EditFormProps } from './Edit';
import { Container } from './styles';
import SwitchComponent from './Switch';

function SAMLSettings(): JSX.Element {
	const { t } = useTranslation(['common', 'organizationsettings']);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);
	const [currentDomain, setCurrentDomain] = useState<SAMLDomain>();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [form] = useForm<EditFormProps>();

	const [SSOFlag] = useFeatureFlag(['SSO'], 'SAML');

	const { data, isLoading, refetch } = useQuery(['saml'], {
		queryFn: () =>
			listAllDomain({
				orgId: (org || [])[0].id,
			}),
		enabled: org !== null,
	});

	const onRecordUpdateHandler = useCallback(
		async (record: SAMLDomain): Promise<boolean> => {
			try {
				const response = await updateDomain(record);

				if (response.statusCode === 200) {
					notification.success({
						message: t('common:success'),
					});
					refetch();

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
		[refetch, t],
	);

	const onCloseHandler = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => (): void => {
			func(false);
		},
		[],
	);

	const onOpenHandler = useCallback(
		(func: React.Dispatch<React.SetStateAction<boolean>>) => (): void => {
			func(true);
		},
		[],
	);

	const onDeleteHandler = useCallback(
		(record: SAMLDomain) => async (): Promise<void> => {
			try {
				const response = await deleteDomain(record);
				if (response.statusCode === 200) {
					notification.success({
						message: t('common:success'),
					});
					refetch();
				} else {
					notification.error({
						message: t('something_went_wrong', {
							ns: 'common',
						}),
					});
				}
			} catch (error) {
				notification.error({
					message: t('something_went_wrong', {
						ns: 'common',
					}),
				});
			}
		},
		[t, refetch],
	);

	const onEditHandler = useCallback(
		(record: SAMLDomain) => async (): Promise<void> => {
			onOpenHandler(setIsSettingsOpen)();
			setCurrentDomain(record);
		},
		[onOpenHandler],
	);

	const columns: ColumnsType<SAMLDomain> = [
		{
			title: 'Domain',
			dataIndex: 'domain',
			key: 'domain',
		},
		{
			title: 'Enforce SSO',
			dataIndex: 'ssoEnforce',
			key: 'ssoEnforce',
			render: (value: boolean, record: SAMLDomain): JSX.Element => {
				if (value === false) {
					return (
						<Button type="link" icon={<LockTwoTone />}>
							Upgrade to Enable SSO
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
			title: 'Description',
			dataIndex: 'description',
			key: 'description',
			render: (_, record: SAMLDomain): JSX.Element => {
				if (!SSOFlag) {
					return (
						<Button onClick={onOpenHandler} type="link" icon={<LockTwoTone />}>
							Update SSO configuration
						</Button>
					);
				}

				const isOneKeyEmpty = !Object.values(record.samlConfig).some((x) => !!x);

				const Icon = isOneKeyEmpty ? CloseCircleTwoTone : CheckCircleTwoTone;
				const color = isOneKeyEmpty ? orange[6] : green[6];

				return (
					<Typography>
						Configure SSO &nbsp;
						<Icon twoToneColor={[color, '#1f1f1f']} />
					</Typography>
				);
			},
		},
		{
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
			render: (_, record): JSX.Element => {
				return (
					<>
						<Button onClick={onEditHandler(record)} type="link">
							Edit
						</Button>

						<Button onClick={onDeleteHandler(record)} danger type="link">
							Delete
						</Button>
					</>
				);
			},
		},
	];

	const defaultConfig: SAMLDomain = useMemo(
		() => ({
			id: v4(),
			name: '',
			orgId: (org || [])[0].id,
			samlConfig: {
				samlCert: '',
				samlEntity: '',
				samlIdp: '',
			},
			ssoEnforce: false,
			ssoType: 'SAML',
		}),
		[org],
	);

	if (!isLoading && data?.payload?.length === 0) {
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
						setIsEditModalOpen={setIsEditModalOpen}
						setIsSettingsOpen={setIsSettingsOpen}
					/>
				</Modal>
				<Table dataSource={[defaultConfig]} columns={columns} tableLayout="fixed" />
			</>
		);
	}

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
					setIsSettingsOpen={setIsSettingsOpen}
					setIsEditModalOpen={setIsEditModalOpen}
				/>
			</Modal>

			<Modal
				visible={isEditModalOpen}
				centered
				title="Configure SAML"
				onCancel={onCloseHandler(setIsEditModalOpen)}
				destroyOnClose
				okText="Save Settings"
				onOk={(): Promise<boolean> =>
					onRecordUpdateHandler({
						...(currentDomain as SAMLDomain),
						samlConfig: {
							samlCert: form.getFieldValue('certificate') || '',
							samlEntity: form.getFieldValue('entityId') || '',
							samlIdp: form.getFieldValue('url') || '',
						},
					})
				}
			>
				<EditSaml
					certificate={currentDomain?.samlConfig.samlCert || ''}
					entityId={currentDomain?.samlConfig.samlEntity || ''}
					url={currentDomain?.samlConfig.samlIdp || ''}
					form={form}
				/>
			</Modal>

			<Space direction="vertical" size="middle">
				<Container>
					<Typography.Title level={3}>
						{t('authenticated_domains', {
							ns: 'organizationsettings',
						})}
					</Typography.Title>
					<Button onClick={onOpenHandler} type="primary" icon={<PlusOutlined />}>
						Add Domains
					</Button>
				</Container>

				<Table
					dataSource={data?.payload || []}
					loading={isLoading}
					columns={columns}
					tableLayout="fixed"
				/>
			</Space>
		</>
	);
}

export default SAMLSettings;

import { WarningFilled } from '@ant-design/icons';
import { Button, Card, Form, Space, Typography } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { checkVersionState } from 'utils/app';

import { githubReleaseURL } from './constant';
import { InputComponent } from './styles';

function Version(): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation();

	const {
		currentVersion,
		latestVersion,
		isCurrentVersionError,
		isLatestVersionError,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const isLatestVersion = checkVersionState(currentVersion, latestVersion);

	const isError = isCurrentVersionError || isLatestVersionError;

	const latestVersionUrl = useMemo(
		() =>
			isLatestVersionError
				? githubReleaseURL
				: `${githubReleaseURL}/tag/${latestVersion}`,
		[isLatestVersionError, latestVersion],
	);

	return (
		<Card style={{ margin: '16px 0' }}>
			<Typography.Title ellipsis level={4} style={{ marginTop: 0 }}>
				{t('version')}
			</Typography.Title>

			<Form
				wrapperCol={{
					span: 14,
				}}
				labelCol={{
					span: 3,
				}}
				layout="horizontal"
				form={form}
				labelAlign="left"
			>
				<Form.Item label={t('current_version')}>
					<InputComponent
						readOnly
						value={isCurrentVersionError ? t('n_a').toString() : currentVersion}
						placeholder={t('current_version')}
					/>
				</Form.Item>

				<Form.Item label={t('latest_version')}>
					<InputComponent
						readOnly
						value={isLatestVersionError ? t('n_a').toString() : latestVersion}
						placeholder={t('latest_version')}
					/>
					<Button href={latestVersionUrl} target="_blank" type="link">
						{t('release_notes')}
					</Button>
				</Form.Item>
			</Form>

			{!isError && isLatestVersion && (
				<div>
					<Space align="start">
						<span>✅</span>
						<Typography.Paragraph italic>
							{t('latest_version_signoz')}
						</Typography.Paragraph>
					</Space>
				</div>
			)}

			{!isError && !isLatestVersion && (
				<div>
					<Space align="start">
						<span>
							<WarningFilled style={{ color: '#E87040' }} />
						</span>
						<Typography.Paragraph italic>{t('stale_version')}</Typography.Paragraph>
					</Space>
				</div>
			)}

			{!isError && !isLatestVersion && (
				<Button
					href="https://signoz.io/docs/operate/docker-standalone/#upgrade"
					target="_blank"
				>
					{t('read_how_to_upgrade')}
				</Button>
			)}
		</Card>
	);
}

export default Version;

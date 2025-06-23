import './Version.styles.scss';

import { Button, Form } from 'antd';
import { CheckCircle, CloudUpload, InfoIcon, Wrench } from 'lucide-react';
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
		<div className="version-container">
			<header className="version-page-header">
				<div className="version-page-header-title">
					<Wrench size={16} />
					Version
				</div>
			</header>

			<div className="version-page-container">
				<div className="version-card">
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
						<div className="version-page-latest-version-container">
							<div className="version-page-latest-version-container-title">
								<CheckCircle size={16} />

								{t('latest_version_signoz')}
							</div>
						</div>
					)}

					{!isError && !isLatestVersion && (
						<div className="version-page-stale-version-container">
							<div className="version-page-stale-version-container-title">
								<InfoIcon size={16} />
								{t('stale_version')}
							</div>
						</div>
					)}

					{!isError && !isLatestVersion && (
						<div className="version-page-upgrade-container">
							<Button
								href="https://signoz.io/docs/operate/docker-standalone/#upgrade"
								target="_blank"
								type="primary"
								className="periscope-btn primary"
								icon={<CloudUpload size={16} />}
							>
								{t('read_how_to_upgrade')}
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default Version;

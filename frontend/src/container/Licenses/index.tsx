import { Tabs } from 'antd';
import Spinner from 'components/Spinner';
import { useAppContext } from 'providers/App/App';
import { useTranslation } from 'react-i18next';

import ApplyLicenseForm from './ApplyLicenseForm';
import ListLicenses from './ListLicenses';

function Licenses(): JSX.Element {
	const { t, ready: translationsReady } = useTranslation(['licenses']);
	const { licenses, licensesRefetch } = useAppContext();

	if (!translationsReady) {
		return <Spinner tip={t('loading_licenses')} height="90vh" />;
	}

	const allValidLicense =
		licenses?.licenses?.filter((license) => license.isCurrent) || [];

	const tabs = [
		{
			label: t('tab_current_license'),
			key: 'licenses',
			children: <ApplyLicenseForm licenseRefetch={licensesRefetch} />,
		},
		{
			label: t('tab_license_history'),
			key: 'history',
			children: <ListLicenses licenses={allValidLicense} />,
		},
	];

	return (
		<Tabs destroyInactiveTabPane defaultActiveKey="licenses" items={tabs} />
	);
}

export default Licenses;

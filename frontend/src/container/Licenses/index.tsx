import { Tabs, Typography } from 'antd';
import getAll from 'api/licenses/getAll';
import Spinner from 'components/Spinner';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ApplyLicenseForm from './ApplyLicenseForm';
import ListLicenses from './ListLicenses';

const { TabPane } = Tabs;

function Licenses(): JSX.Element {
	const { t } = useTranslation(['licenses']);
	const { loading, payload, error, errorMessage } = useFetch(getAll);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || payload === undefined) {
		return <Spinner tip={t('loading_licenses')} height="90vh" />;
	}

	return (
		<Tabs destroyInactiveTabPane defaultActiveKey="licenses">
			<TabPane tabKey="licenses" tab={t('tab_current_license')} key="licenses">
				<ApplyLicenseForm />
				<ListLicenses licenses={payload.filter((l) => l.isCurrent === true)} />
			</TabPane>

			<TabPane tabKey="history" tab={t('tab_license_history')} key="history">
				<ListLicenses licenses={payload.filter((l) => l.isCurrent === false)} />
			</TabPane>
		</Tabs>
	);
}

export default Licenses;

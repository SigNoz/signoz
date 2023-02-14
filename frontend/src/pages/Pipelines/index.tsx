import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import PipelinePage from 'container/PipelinePage/Layouts';
import React from 'react';
import { useTranslation } from 'react-i18next';

function Pipelines(): JSX.Element {
	const { t } = useTranslation('translation');
	return (
		<RouteTab
			{...{
				routes: [
					{
						Component: PipelinePage,
						name: t('routes.pipelines'),
						route: ROUTES.PIPELINES,
					},
				],
				activeKey: t('routes.pipelines'),
			}}
		/>
	);
}

export default Pipelines;

import { useLocation } from 'react-router-dom';
import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import history from 'lib/history';

import {
	AttributeMapping,
	Explorer,
	ModelPricing,
	Overview,
} from './constants';

import './LLMObservability.styles.scss';

const routes: TabRoutes[] = [
	Overview,
	Explorer,
	ModelPricing,
	AttributeMapping,
];

function LLMObservabilityPage(): JSX.Element {
	const { pathname } = useLocation();

	return (
		<div
			className="ai-observability-module-container"
			data-testid="llm-observability-page"
		>
			<RouteTab routes={routes} activeKey={pathname} history={history} />
		</div>
	);
}

export default LLMObservabilityPage;

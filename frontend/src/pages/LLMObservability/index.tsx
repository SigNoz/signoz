import RouteTab from 'components/RouteTab';
import { TabRoutes } from 'components/RouteTab/types';
import { useAppLocation } from 'lib/router/useAppLocation';

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
	const { pathname } = useAppLocation();

	return (
		<div
			className="ai-observability-module-container"
			data-testid="llm-observability-page"
		>
			<RouteTab routes={routes} activeKey={pathname} />
		</div>
	);
}

export default LLMObservabilityPage;

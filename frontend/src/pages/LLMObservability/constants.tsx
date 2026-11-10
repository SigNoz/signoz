import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import LLMObservabilityAttributeMapping from 'container/LLMObservability/AttributeMapping/LLMObservabilityAttributeMapping';
import ExplorerPage from 'container/LLMObservability/Explorer/Explorer';
import OverviewPage from 'container/LLMObservability/Overview/Overview';
import LLMObservabilityModelPricing from 'container/LLMObservability/Settings/ModelPricing/LLMObservabilityModelPricing';
import {
	ArrowRightLeft,
	BarChart,
	CircleDollarSign,
	Compass,
} from '@signozhq/icons';

export const Overview: TabRoutes = {
	Component: OverviewPage,
	name: (
		<div className="tab-item">
			<BarChart size={16} /> Overview
		</div>
	),
	route: ROUTES.AI_OBSERVABILITY_OVERVIEW,
	key: ROUTES.AI_OBSERVABILITY_OVERVIEW,
};

export const Explorer: TabRoutes = {
	Component: ExplorerPage,
	name: (
		<div className="tab-item">
			<Compass size={16} /> Explorer
		</div>
	),
	route: ROUTES.AI_OBSERVABILITY_EXPLORER,
	key: ROUTES.AI_OBSERVABILITY_EXPLORER,
};

export const ModelPricing: TabRoutes = {
	Component: LLMObservabilityModelPricing,
	name: (
		<div className="tab-item">
			<CircleDollarSign size={16} /> Model pricing
		</div>
	),
	route: ROUTES.AI_OBSERVABILITY_CONFIGURATION,
	key: ROUTES.AI_OBSERVABILITY_CONFIGURATION,
};

export const AttributeMapping: TabRoutes = {
	Component: LLMObservabilityAttributeMapping,
	name: (
		<div className="tab-item">
			<ArrowRightLeft size={16} /> Attribute Mapping
		</div>
	),
	route: ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING,
	key: ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING,
};

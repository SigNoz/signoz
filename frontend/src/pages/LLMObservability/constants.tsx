import Loadable from 'components/Loadable';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import {
	ArrowRightLeft,
	BarChart,
	CircleDollarSign,
	Compass,
} from '@signozhq/icons';

const OverviewPage = Loadable(
	() => import('container/LLMObservability/Overview/Overview'),
);
const ExplorerPage = Loadable(
	() => import('container/LLMObservability/Explorer/Explorer'),
);
const LLMObservabilityModelPricing = Loadable(
	() =>
		import('container/LLMObservability/Settings/ModelPricing/LLMObservabilityModelPricing'),
);
const LLMObservabilityAttributeMapping = Loadable(
	() =>
		import('container/LLMObservability/AttributeMapping/LLMObservabilityAttributeMapping'),
);

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

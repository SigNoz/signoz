import { Tabs } from '@signozhq/ui/tabs';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { TAB_KEYS, TAB_QUERY_KEY } from './constants';
import ModelCostsTab from './ModelCostsTab';
import type { TabKey } from './types';

import './LLMObservabilityModelPricing.styles.scss';

function LLMObservabilityModelPricing(): JSX.Element {
	// Active tab lives in the URL so the view is shareable/reload-safe.
	const [tab, setTab] = useQueryState(
		TAB_QUERY_KEY,
		parseAsStringLiteral(TAB_KEYS).withDefault('model-costs').withOptions({
			history: 'replace',
		}),
	);

	return (
		<div
			className="llm-observability-model-pricing"
			data-testid="llm-observability-model-pricing-page"
		>
			<header className="page-header">
				<div className="page-header__title">
					<h1>Configuration</h1>
					<p>Model pricing and cost estimation settings</p>
				</div>
			</header>

			<Tabs
				className="page-tabs"
				value={tab}
				onChange={(key): void => {
					void setTab(key as TabKey);
				}}
				items={[
					{
						key: 'model-costs',
						label: 'Model costs',
						children: <ModelCostsTab />,
					},
					{
						// Unpriced-models tab lands in a later PR.
						key: 'unpriced-models',
						label: 'Unpriced models',
						disabled: true,
						children: null,
					},
				]}
			/>
		</div>
	);
}

export default LLMObservabilityModelPricing;

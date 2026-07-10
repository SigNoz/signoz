import { Tabs } from '@signozhq/ui/tabs';

import AttributeMappingHeader from './components/AttributeMappingHeader';
import AttributeMappingsTab from './AttributeMappingsTab/AttributeMappingsTab';
import styles from './LLMObservabilityAttributeMapping.module.scss';

const noop = (): void => undefined;

function LLMObservabilityAttributeMapping(): JSX.Element {
	const tabItems = [
		{
			key: 'attribute-mappings',
			label: 'Attribute mappings',
			children: <AttributeMappingsTab />,
		},
		{
			key: 'test',
			label: 'Test',
			disabled: true,
			disabledReason: 'Coming soon',
			children: null,
		},
	];

	return (
		<div
			className={styles.llmObservabilityAttributeMapping}
			data-testid="llm-observability-attribute-mapping-page"
		>
			<AttributeMappingHeader
				isDirty={false}
				isSaving={false}
				onDiscard={noop}
				onSave={noop}
			/>

			<Tabs
				testId="attribute-mapping-tabs"
				defaultValue="attribute-mappings"
				items={tabItems}
			/>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;

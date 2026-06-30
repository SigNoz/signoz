import { Tabs } from '@signozhq/ui/tabs';
import { Typography } from '@signozhq/ui/typography';

import AttributeMappingTabPanel from './AttributeMappingTabPanel';
import styles from './LLMObservabilityAttributeMapping.module.scss';

function LLMObservabilityAttributeMapping(): JSX.Element {
	return (
		<div
			className={styles.llmObservabilityAttributeMapping}
			data-testid="llm-observability-attribute-mapping-page"
		>
			<header className={styles.pageHeader}>
				<div className={styles.pageHeaderTitle}>
					<Typography.Text as="h1" size="large" weight="semibold">
						Configuration
					</Typography.Text>
					<Typography.Text color="muted">
						Map source LLM trace attributes to SigNoz semantic conventions
					</Typography.Text>
				</div>
			</header>

			<Tabs
				// Attribute mapping is the only tab for now. As more grouping/mapping
				// views land, this can become a URL-backed param like model pricing.
				defaultValue="attribute-mapping"
				items={[
					{
						key: 'attribute-mapping',
						label: 'Attribute mapping',
						children: <AttributeMappingTabPanel />,
					},
				]}
			/>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;

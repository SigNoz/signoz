import AttributeMappingHeader from './AttributeMappingHeader';

import './LLMObservabilityAttributeMapping.styles.scss';

const noop = (): void => undefined;

function LLMObservabilityAttributeMapping(): JSX.Element {
	return (
		<div
			className="llm-observability-attribute-mapping"
			data-testid="llm-observability-attribute-mapping-page"
		>
			<AttributeMappingHeader
				isDirty={false}
				isSaving={false}
				onDiscard={noop}
				onSave={noop}
			/>

			<div className="am-table__empty" data-testid="attribute-mapping-empty">
				No mapping groups configured yet.
			</div>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;

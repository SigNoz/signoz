import AttributeMappingHeader from './components/AttributeMappingHeader';
import styles from './LLMObservabilityAttributeMapping.module.scss';

const noop = (): void => undefined;

function LLMObservabilityAttributeMapping(): JSX.Element {
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

			<div className={styles.tableEmpty} data-testid="attribute-mapping-empty">
				No mapping groups configured yet.
			</div>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;

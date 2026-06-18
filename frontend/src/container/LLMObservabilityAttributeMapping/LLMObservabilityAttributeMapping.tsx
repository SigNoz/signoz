import AttributeMappingHeader from './AttributeMappingHeader';
import MapperGroupsTable from './MapperGroupsTable';
import { useAttributeMappingStore } from './useAttributeMappingStore';

import './LLMObservabilityAttributeMapping.styles.scss';

const noop = (): void => undefined;

function LLMObservabilityAttributeMapping(): JSX.Element {
	const store = useAttributeMappingStore();

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

			{store.isError && (
				<div className="page-error" role="alert">
					Failed to load mapping groups. Please try again.
				</div>
			)}

			<MapperGroupsTable store={store} />

			<footer className="page-footer">
				Showing {store.groups.length} group{store.groups.length === 1 ? '' : 's'}
			</footer>
		</div>
	);
}

export default LLMObservabilityAttributeMapping;

import { Checkbox, Empty } from 'antd';
import { TelemetryFieldKey } from 'api/v5/v5';
import { AxiosResponse } from 'axios';
import FieldVariantBadges from 'components/FieldVariantBadges/FieldVariantBadges';
import Spinner from 'components/Spinner';
import { EXCLUDED_COLUMNS } from 'container/OptionsMenu/constants';
import {
	getUniqueColumnKey,
	getVariantCounts,
} from 'container/OptionsMenu/utils';
import {
	QueryKeyDataSuggestionsProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

type ExplorerAttributeColumnsProps = {
	isLoading: boolean;
	data: AxiosResponse<QueryKeySuggestionsResponseProps> | undefined;
	searchText: string;
	isAttributeKeySelected: (
		attributeKey: QueryKeyDataSuggestionsProps,
	) => boolean;
	handleCheckboxChange: (attributeKey: QueryKeyDataSuggestionsProps) => void;
	dataSource: DataSource;
};

function ExplorerAttributeColumns({
	isLoading,
	data,
	searchText,
	isAttributeKeySelected,
	handleCheckboxChange,
	dataSource,
}: ExplorerAttributeColumnsProps): JSX.Element {
	if (isLoading) {
		return (
			<div className="attribute-columns">
				<Spinner size="large" tip="Loading..." height="2vh" />
			</div>
		);
	}

	const filteredAttributeKeys =
		Object.values(data?.data?.data?.keys || {})
			?.flat()
			?.filter(
				(attributeKey) =>
					attributeKey.name.toLowerCase().includes(searchText.toLowerCase()) &&
					!EXCLUDED_COLUMNS[dataSource].includes(attributeKey.name),
			) || [];

	// Detect which column names have multiple variants
	const nameCounts = getVariantCounts(
		filteredAttributeKeys as TelemetryFieldKey[],
	);

	if (filteredAttributeKeys.length === 0) {
		return (
			<div className="attribute-columns">
				<Empty description="No columns found" />
			</div>
		);
	}

	return (
		<div className="attribute-columns">
			{filteredAttributeKeys.map((attributeKey) => {
				const hasVariants = nameCounts[attributeKey.name] > 1;
				return (
					<Checkbox
						checked={isAttributeKeySelected(attributeKey)}
						onChange={(): void => handleCheckboxChange(attributeKey)}
						key={getUniqueColumnKey(attributeKey)}
					>
						<span className="attribute-column-label-wrapper">
							<span>{attributeKey.name}</span>
							{hasVariants && (
								<FieldVariantBadges
									fieldDataType={attributeKey.fieldDataType}
									fieldContext={attributeKey.fieldContext}
								/>
							)}
						</span>
					</Checkbox>
				);
			})}
		</div>
	);
}

export default ExplorerAttributeColumns;

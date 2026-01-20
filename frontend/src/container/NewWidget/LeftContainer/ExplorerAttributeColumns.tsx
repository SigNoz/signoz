import { Checkbox, Empty } from 'antd';
import { AxiosResponse } from 'axios';
import Spinner from 'components/Spinner';
import { EXCLUDED_COLUMNS } from 'container/OptionsMenu/constants';
import { QueryKeySuggestionsResponseProps } from 'types/api/querySuggestions/types';
import { DataSource } from 'types/common/queryBuilder';

type ExplorerAttributeColumnsProps = {
	isLoading: boolean;
	data: AxiosResponse<QueryKeySuggestionsResponseProps> | undefined;
	searchText: string;
	isAttributeKeySelected: (key: string) => boolean;
	handleCheckboxChange: (key: string) => void;
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
	if (filteredAttributeKeys.length === 0) {
		return (
			<div className="attribute-columns">
				<Empty description="No columns found" />
			</div>
		);
	}

	return (
		<div className="attribute-columns">
			{filteredAttributeKeys.map((attributeKey: any) => (
				<Checkbox
					checked={isAttributeKeySelected(attributeKey.name)}
					onChange={(): void => handleCheckboxChange(attributeKey.name)}
					style={{ padding: 0 }}
					key={attributeKey.name}
				>
					{attributeKey.name}
				</Checkbox>
			))}
		</div>
	);
}

export default ExplorerAttributeColumns;

import { Checkbox, Empty } from 'antd';
import Spinner from 'components/Spinner';

type ExplorerAttributeColumnsProps = {
	isLoading: boolean;
	data: any;
	searchText: string;
	isAttributeKeySelected: (key: string) => boolean;
	handleCheckboxChange: (key: string) => void;
};

function ExplorerAttributeColumns({
	isLoading,
	data,
	searchText,
	isAttributeKeySelected,
	handleCheckboxChange,
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
			?.filter((attributeKey: any) =>
				attributeKey.name.toLowerCase().includes(searchText.toLowerCase()),
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

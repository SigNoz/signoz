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
	return (
		<div className="attribute-columns">
			{isLoading ? (
				<Spinner size="large" tip="Loading..." height="2vh" />
			) : (
				((): JSX.Element | JSX.Element[] => {
					const filteredAttributeKeys =
						data?.payload?.attributeKeys?.filter((attributeKey: any) =>
							attributeKey.key.toLowerCase().includes(searchText.toLowerCase()),
						) || [];
					if (filteredAttributeKeys.length === 0) {
						return <Empty description="No columns found" />;
					}
					return filteredAttributeKeys.map((attributeKey: any) => (
						<Checkbox
							checked={isAttributeKeySelected(attributeKey.key)}
							onChange={(): void => handleCheckboxChange(attributeKey.key)}
							style={{ padding: 0 }}
							key={attributeKey.key}
						>
							{attributeKey.key}
						</Checkbox>
					));
				})()
			)}
		</div>
	);
}

export default ExplorerAttributeColumns;

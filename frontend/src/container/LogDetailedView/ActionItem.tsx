import { CircleMinus, CirclePlus } from '@signozhq/icons';
import { Button, Col, Popover } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

function ActionItem({
	fieldKey,
	fieldValue,
	onClickActionItem,
}: ActionItemProps): JSX.Element {
	const handleClick = (operator: string): void => {
		const validatedFieldValue = removeJSONStringifyQuotes(fieldValue);

		onClickActionItem(fieldKey, validatedFieldValue, operator);
	};

	const onClickHandler = (operator: string) => (): void => {
		handleClick(operator);
	};

	const PopOverMenuContent = (
		<Col>
			<Button type="text" size="small" onClick={onClickHandler(OPERATORS.IN)}>
				<CirclePlus size={12} /> Filter for value
			</Button>
			<br />
			<Button type="text" size="small" onClick={onClickHandler(OPERATORS.NIN)}>
				<CircleMinus size={12} /> Filter out value
			</Button>
		</Col>
	);
	return (
		<Popover placement="bottomLeft" content={PopOverMenuContent} trigger="click">
			<Button type="text" size="small">
				...
			</Button>
		</Popover>
	);
}

export interface ActionItemProps {
	fieldKey: string;
	fieldValue: string;
	onClickActionItem: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
		dataType?: DataTypes,
		fieldType?: string,
	) => void;
}

export default ActionItem;

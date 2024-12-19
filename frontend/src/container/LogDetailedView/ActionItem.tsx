import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Col, Popover } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { memo, useCallback, useMemo } from 'react';

function ActionItem({
	fieldKey,
	fieldValue,
	onClickActionItem,
}: ActionItemProps): JSX.Element {
	const handleClick = useCallback(
		(operator: string) => {
			const validatedFieldValue = removeJSONStringifyQuotes(fieldValue);

			onClickActionItem(fieldKey, validatedFieldValue, operator);
		},
		[onClickActionItem, fieldKey, fieldValue],
	);

	const onClickHandler = useCallback(
		(operator: string) => (): void => {
			handleClick(operator);
		},
		[handleClick],
	);

	const PopOverMenuContent = useMemo(
		() => (
			<Col>
				<Button type="text" size="small" onClick={onClickHandler(OPERATORS.IN)}>
					<PlusCircleOutlined size={12} /> Filter for value
				</Button>
				<br />
				<Button type="text" size="small" onClick={onClickHandler(OPERATORS.NIN)}>
					<MinusCircleOutlined size={12} /> Filter out value
				</Button>
			</Col>
		),
		[onClickHandler],
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
	) => void;
}

export default memo(ActionItem);

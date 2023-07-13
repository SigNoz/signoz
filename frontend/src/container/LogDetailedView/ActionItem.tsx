import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Col, Popover } from 'antd';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { memo, useCallback, useMemo } from 'react';

export interface ActionItemProps {
	fieldKey: string;
	fieldValue: string;
	onClickActionItem: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
	) => void;
}
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

	const PopOverMenuContent = useMemo(
		() => (
			<Col>
				<Button type="text" size="small" onClick={(): void => handleClick('IN')}>
					<PlusCircleOutlined /> Filter for value
				</Button>
				<br />
				<Button type="text" size="small" onClick={(): void => handleClick('NIN')}>
					<MinusCircleOutlined /> Filter out value
				</Button>
			</Col>
		),
		[handleClick],
	);
	return (
		<Popover placement="bottomLeft" content={PopOverMenuContent} trigger="click">
			<Button type="text" size="small">
				...
			</Button>
		</Popover>
	);
}

export default memo(ActionItem);

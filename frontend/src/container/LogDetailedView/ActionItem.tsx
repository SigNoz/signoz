import { memo, useCallback, useMemo } from 'react';
import { CircleMinus, CirclePlus } from '@signozhq/icons';
import { Col, Popover } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Button } from '@signozhq/ui/button';

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
				<Button onClick={onClickHandler(OPERATORS.IN)} size="sm" variant="ghost">
					<CirclePlus size={12} /> Filter for value
				</Button>
				<br />
				<Button onClick={onClickHandler(OPERATORS.NIN)} size="sm" variant="ghost">
					<CircleMinus size={12} /> Filter out value
				</Button>
			</Col>
		),
		[onClickHandler],
	);
	return (
		<Popover placement="bottomLeft" content={PopOverMenuContent} trigger="click">
			<Button size="sm" variant="ghost">
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

export default memo(ActionItem);

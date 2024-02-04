import './ActionItem.styles.scss';

import {
	DisconnectOutlined,
	MinusCircleOutlined,
	PlusCircleOutlined,
	PushpinOutlined,
} from '@ant-design/icons';
import { Button, Popover, Space } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { Dispatch, memo, useCallback, useMemo, useState } from 'react';

import { LogDataSource } from './LogDetailedView.types';
import {
	addPinnedItemToLocalStorage,
	getPinnedLogItems,
	getRearrangedDataSource,
	removePinnedLogItem,
} from './utils';

function ActionItem({
	unparsedKey,
	fieldKey,
	fieldValue,
	onClickActionItem,
	dataSource,
	setDataSource,
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

	const [open, setOpen] = useState(false);
	const hide = (): void => {
		setOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setOpen(newOpen);
	};

	const pinHandler = useCallback((): void => {
		addPinnedItemToLocalStorage(unparsedKey);
		const newDataSource = getRearrangedDataSource(dataSource);
		setDataSource(newDataSource);
		hide();
	}, [unparsedKey, dataSource, setDataSource]);

	const unpinHandler = useCallback((): void => {
		removePinnedLogItem(unparsedKey);
		const newDataSource = getRearrangedDataSource(dataSource);
		setDataSource(newDataSource);
		hide();
	}, [dataSource, setDataSource, unparsedKey]);

	const isFieldPinned: boolean = getPinnedLogItems().includes(unparsedKey);

	const PopOverMenuContent = useMemo(
		() => (
			<Space direction="vertical" className="ActionButton">
				<Button type="text" size="small" onClick={onClickHandler(OPERATORS.IN)}>
					<PlusCircleOutlined /> Filter for value
				</Button>
				<Button type="text" size="small" onClick={onClickHandler(OPERATORS.NIN)}>
					<MinusCircleOutlined /> Filter out value
				</Button>
				{!isFieldPinned ? (
					<Button
						type="text"
						size="small"
						className="pin-button"
						onClick={pinHandler}
					>
						<PushpinOutlined />
						Pin
					</Button>
				) : (
					<Button
						type="text"
						size="small"
						className="pin-button"
						onClick={unpinHandler}
					>
						<DisconnectOutlined />
						Unpin
					</Button>
				)}
			</Space>
		),
		[isFieldPinned, onClickHandler, pinHandler, unpinHandler],
	);
	return (
		<Popover
			className="ActionItem"
			placement="bottomLeft"
			content={PopOverMenuContent}
			trigger="click"
			open={open}
			onOpenChange={handleOpenChange}
		>
			<Button type="text" size="small">
				...
			</Button>
			{isFieldPinned && <PushpinOutlined />}
		</Popover>
	);
}

export interface ActionItemProps {
	unparsedKey: string;
	fieldKey: string;
	fieldValue: string;
	onClickActionItem: (
		fieldKey: string,
		fieldValue: string,
		operator: string,
	) => void;
	dataSource: LogDataSource;
	setDataSource: Dispatch<LogDataSource>;
}

export default memo(ActionItem);

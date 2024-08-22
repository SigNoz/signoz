import './TableViewActions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover, Spin, Tooltip, Tree } from 'antd';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { OPERATORS } from 'constants/queryBuilder';
import { isEmpty } from 'lodash-es';
import { ArrowDownToDot, ArrowUpFromDot, Ellipsis, Frame } from 'lucide-react';
import { useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { DataType } from '../TableView';
import {
	filterKeyForField,
	jsonToDataNodes,
	recursiveParseJSON,
	removeEscapeCharacters,
} from '../utils';

interface ITableViewActionsProps {
	fieldData: Record<string, string>;
	record: DataType;
	isListViewPanel: boolean;
	isfilterInLoading: boolean;
	isfilterOutLoading: boolean;
	onGroupByAttribute?: (
		fieldKey: string,
		isJSON?: boolean,
		dataType?: DataTypes,
	) => Promise<void>;
	onClickHandler: (
		operator: string,
		fieldKey: string,
		fieldValue: string,
	) => () => void;
}

export function TableViewActions(
	props: ITableViewActionsProps,
): React.ReactElement {
	const {
		fieldData,
		record,
		isListViewPanel,
		isfilterInLoading,
		isfilterOutLoading,
		onClickHandler,
		onGroupByAttribute,
	} = props;

	console.log(onGroupByAttribute);

	const [isOpen, setIsOpen] = useState<boolean>(false);
	const textToCopy = fieldData.value.slice(1, -1);

	if (record.field === 'body') {
		const parsedBody = recursiveParseJSON(fieldData.value);
		if (!isEmpty(parsedBody)) {
			return (
				<Tree defaultExpandAll showLine treeData={jsonToDataNodes(parsedBody)} />
			);
		}
	}

	const fieldFilterKey = filterKeyForField(fieldData.field);

	return (
		<div className="value-field">
			<CopyClipboardHOC textToCopy={textToCopy}>
				<span
					style={{
						color: Color.BG_SIENNA_400,
						whiteSpace: 'pre-wrap',
						tabSize: 4,
					}}
				>
					{removeEscapeCharacters(fieldData.value)}
				</span>
			</CopyClipboardHOC>

			{!isListViewPanel && (
				<span className="action-btn">
					<Tooltip title="Filter for value">
						<Button
							className="filter-btn periscope-btn"
							icon={
								isfilterInLoading ? (
									<Spin size="small" />
								) : (
									<ArrowDownToDot size={14} style={{ transform: 'rotate(90deg)' }} />
								)
							}
							onClick={onClickHandler(OPERATORS.IN, fieldFilterKey, fieldData.value)}
						/>
					</Tooltip>
					<Tooltip title="Filter out value">
						<Button
							className="filter-btn periscope-btn"
							icon={
								isfilterOutLoading ? (
									<Spin size="small" />
								) : (
									<ArrowUpFromDot size={14} style={{ transform: 'rotate(90deg)' }} />
								)
							}
							onClick={onClickHandler(OPERATORS.NIN, fieldFilterKey, fieldData.value)}
						/>
					</Tooltip>
					<Popover
						open={isOpen}
						onOpenChange={setIsOpen}
						arrow={false}
						content={
							<div>
								<Button
									className="group-by-clause"
									type="text"
									icon={<Frame size={14} />}
									onClick={(): Promise<void> | void =>
										onGroupByAttribute?.(fieldFilterKey)
									}
								>
									Group By Attribute
								</Button>
							</div>
						}
						rootClassName="table-view-actions-content"
						trigger="click"
						placement="bottomLeft"
					>
						<Button
							icon={<Ellipsis size={14} />}
							className="filter-btn periscope-btn"
						/>
					</Popover>
				</span>
			)}
		</div>
	);
}

TableViewActions.defaultProps = {
	onGroupByAttribute: undefined,
};

import { memo, useMemo } from 'react';
import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Popover, Tooltip, Typography } from 'antd';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import { popupContainer } from 'utils/selectPopupContainer';

import { ALL_SELECT_VALUE } from '../utils';
import { SelectItemStyle } from './styles';

const errorIconStyle = { margin: '0 0.5rem' };

interface SelectVariableInputProps {
	variableId: string;
	options: (string | number | boolean)[];
	value: string | string[] | undefined;
	enableSelectAll: boolean;
	isMultiSelect: boolean;
	onChange: (value: string | string[]) => void;
	onClear: () => void;
	defaultValue?: string | string[];
	onDropdownVisibleChange?: (visible: boolean) => void;
	loading?: boolean;
	errorMessage?: string | null;
	onRetry?: () => void;
}

const MAX_TAG_DISPLAY_VALUES = 10;

function maxTagPlaceholder(
	omittedValues: { label?: React.ReactNode; value?: string | number }[],
): JSX.Element {
	const valuesToShow = omittedValues.slice(0, MAX_TAG_DISPLAY_VALUES);
	const hasMore = omittedValues.length > MAX_TAG_DISPLAY_VALUES;
	const tooltipText =
		valuesToShow.map(({ value: v }) => v ?? '').join(', ') +
		(hasMore ? ` + ${omittedValues.length - MAX_TAG_DISPLAY_VALUES} more` : '');

	return (
		<Tooltip title={tooltipText}>
			<span>+ {omittedValues.length} </span>
		</Tooltip>
	);
}

function SelectVariableInput({
	variableId,
	options,
	value,
	onChange,
	onDropdownVisibleChange,
	onClear,
	loading,
	errorMessage,
	onRetry,
	enableSelectAll,
	isMultiSelect,
	defaultValue,
}: SelectVariableInputProps): JSX.Element {
	const selectOptions = useMemo(
		() =>
			options.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		[options],
	);

	const commonProps = useMemo(
		() => ({
			// main props
			key: variableId,
			value,
			defaultValue,

			// setup props
			placeholder: 'Select value',
			className: 'variable-select',
			popupClassName: 'dropdown-styles',
			getPopupContainer: popupContainer,
			style: SelectItemStyle,
			showSearch: true,
			bordered: false,

			// dynamic props
			'data-testid': 'variable-select',
			onChange,
			loading,
			options: selectOptions,
			errorMessage,
			onRetry,
		}),
		[
			variableId,
			defaultValue,
			onChange,
			loading,
			selectOptions,
			value,
			errorMessage,
			onRetry,
		],
	);

	return (
		<>
			{isMultiSelect ? (
				<CustomMultiSelect
					{...commonProps}
					placement="bottomLeft"
					maxTagCount={2}
					onDropdownVisibleChange={onDropdownVisibleChange}
					maxTagPlaceholder={maxTagPlaceholder}
					onClear={onClear}
					enableAllSelection={enableSelectAll}
					maxTagTextLength={30}
					allowClear={value !== ALL_SELECT_VALUE && value !== 'ALL'}
				/>
			) : (
				<CustomSelect {...commonProps} />
			)}

			{errorMessage && (
				<span style={errorIconStyle}>
					<Popover
						placement="top"
						content={
							<Typography style={{ whiteSpace: 'pre-wrap' }}>
								{errorMessage}
							</Typography>
						}
					>
						<WarningOutlined style={{ color: orange[5] }} />
					</Popover>
				</span>
			)}
		</>
	);
}

export default memo(SelectVariableInput);

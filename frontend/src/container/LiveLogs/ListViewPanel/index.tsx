import { Button, Popover, Select } from 'antd';
import Spinner from 'components/Spinner';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useOptionsMenu } from 'container/OptionsMenu';
import {
	defaultSelectStyle,
	logsOptions,
	viewModeOptionList,
} from 'pages/Logs/config';
import PopoverContent from 'pages/Logs/PopoverContent';
import { useEventSource } from 'providers/EventSource';
import { useCallback } from 'react';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import { SpinnerWrapper, Wrapper } from './styles';

function ListViewPanel(): JSX.Element {
	const { config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: StringOperators.NOOP,
	});

	const { isConnectionLoading } = useEventSource();

	const isFormatButtonVisible = logsOptions.includes(config.format?.value);

	const renderPopoverContent = useCallback(() => {
		if (!config.maxLines) return null;
		const linedPerRow = config.maxLines.value as number;
		const handleLinesPerRowChange = config.maxLines.onChange as (
			value: unknown,
		) => void;

		return (
			<PopoverContent
				linesPerRow={linedPerRow}
				handleLinesPerRowChange={handleLinesPerRowChange}
			/>
		);
	}, [config]);

	return (
		<Wrapper>
			<Select
				getPopupContainer={popupContainer}
				style={defaultSelectStyle}
				value={config.format?.value}
				onChange={config.format?.onChange}
			>
				{viewModeOptionList.map((option) => (
					<Select.Option key={option.value}>{option.label}</Select.Option>
				))}
			</Select>

			{isFormatButtonVisible && (
				<Popover
					getPopupContainer={popupContainer}
					placement="right"
					content={renderPopoverContent}
				>
					<Button>Format</Button>
				</Popover>
			)}
			{isConnectionLoading && (
				<SpinnerWrapper>
					<Spinner style={{ height: 'auto' }} />
				</SpinnerWrapper>
			)}
		</Wrapper>
	);
}

export default ListViewPanel;

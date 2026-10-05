import { ReactNode, useState } from 'react';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import DownloadOptionsMenu from 'components/DownloadOptionsMenu/DownloadOptionsMenu';
import FieldsSelector from 'components/FieldsSelector';
import LogsFormatOptionsMenu from 'components/LogsFormatOptionsMenu/LogsFormatOptionsMenu';
import ListViewOrderBy from 'components/OrderBy/ListViewOrderBy';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useOptionsMenu } from 'container/OptionsMenu';
import { LOGS_REQUIRED_COLUMNS } from 'container/OptionsMenu/constants';
import { ArrowUp10, Minus } from '@signozhq/icons';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

function LogsActionsContainer({
	listQuery,
	showFrequencyChart,
	handleToggleFrequencyChart,
	orderBy,
	setOrderBy,
	explorerActions,
}: {
	listQuery: any;
	showFrequencyChart: boolean;
	handleToggleFrequencyChart: () => void;
	orderBy: string;
	setOrderBy: (value: string) => void;
	explorerActions: ReactNode;
}): JSX.Element {
	const { options, config } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: DataSource.LOGS,
		aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	});

	const [isFieldsSelectorOpen, setIsFieldsSelectorOpen] = useState(false);

	const formatItems = [
		{
			key: 'raw',
			label: 'Raw',
			data: {
				title: 'max lines per row',
			},
		},
		{
			key: 'list',
			label: 'Default',
		},
		{
			key: 'table',
			label: 'Column',
			data: {
				title: 'columns',
			},
		},
	];

	return (
		<div className="logs-actions-container">
			<div className="tab-options">
				<div className="tab-options-left">
					<div className="frequency-chart-view-controller">
						<Typography>Frequency chart</Typography>
						<Switch
							value={showFrequencyChart}
							defaultValue
							onChange={handleToggleFrequencyChart}
						/>
					</div>
				</div>

				<div className="tab-options-right">
					{explorerActions}
					<div className="order-by-container">
						<div className="order-by-label">
							Order by <Minus size={14} /> <ArrowUp10 size={14} />
						</div>

						<ListViewOrderBy
							value={orderBy}
							onChange={(value): void => setOrderBy(value)}
							dataSource={DataSource.LOGS}
						/>
					</div>
					<div className="download-options-container">
						<DownloadOptionsMenu
							dataSource={DataSource.LOGS}
							selectedColumns={options?.selectColumns}
						/>
					</div>
					<div className="format-options-container">
						<LogsFormatOptionsMenu
							items={formatItems}
							selectedOptionFormat={options.format}
							config={config}
							onOpenColumns={(): void => setIsFieldsSelectorOpen(true)}
						/>
					</div>
				</div>
			</div>
			{config.fieldsSelector && (
				<FieldsSelector
					isOpen={isFieldsSelectorOpen}
					title="Edit columns"
					fields={config.fieldsSelector.value}
					onFieldsChange={config.fieldsSelector.onFieldsChange}
					onClose={(): void => setIsFieldsSelectorOpen(false)}
					signal={DataSource.LOGS}
					requiredFields={LOGS_REQUIRED_COLUMNS}
					allowCustomFields
				/>
			)}
		</div>
	);
}

export default LogsActionsContainer;

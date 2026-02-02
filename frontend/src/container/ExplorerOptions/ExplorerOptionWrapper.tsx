import { useEffect, useState } from 'react';

import ExplorerOptions, { ExplorerOptionsProps } from './ExplorerOptions';
import { getExplorerToolBarVisibility } from './utils';

type ExplorerOptionsWrapperProps = Omit<
	ExplorerOptionsProps,
	'isExplorerOptionDrop'
>;

function ExplorerOptionWrapper({
	disabled,
	query,
	isLoading,
	onExport,
	sourcepage,
	isOneChartPerQuery,
	splitedQueries,
	signalSource,
	handleChangeSelectedView,
}: ExplorerOptionsWrapperProps): JSX.Element {
	const [isExplorerOptionHidden, setIsExplorerOptionHidden] = useState(false);

	useEffect(() => {
		const toolbarVisibility = getExplorerToolBarVisibility(sourcepage);
		setIsExplorerOptionHidden(!toolbarVisibility);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<ExplorerOptions
			disabled={disabled}
			query={query}
			isLoading={isLoading}
			onExport={onExport}
			sourcepage={sourcepage}
			signalSource={signalSource}
			isExplorerOptionHidden={isExplorerOptionHidden}
			setIsExplorerOptionHidden={setIsExplorerOptionHidden}
			isOneChartPerQuery={isOneChartPerQuery}
			splitedQueries={splitedQueries}
			handleChangeSelectedView={handleChangeSelectedView}
		/>
	);
}

export default ExplorerOptionWrapper;

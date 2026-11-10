import { Drawer } from '@signozhq/ui/drawer';

import { LogDetailProps } from './LogDetail.interfaces';
import LogDetailBody from './LogDetailBody';
import LogActions from './LogDetailsHeader/LogActions';
import LogNavigation from './LogDetailsHeader/LogNavigation';
import { useLogNavigation } from './LogDetailsHeader/useLogNavigation';
import { useLogTimestamp } from './LogDetailsHeader/useLogTimestamp';
import { useShownLog } from './useShownLog';

import './LogDetails.styles.scss';

function LogDetail({
	log,
	onClose,
	selectedTab,
	isListViewPanel,
	handleChangeSelectedView,
	logs,
	onNavigateLog,
	onScrollToLog,
	handleOpenInExplorer,
	onApplyLogFilter,
}: LogDetailProps): JSX.Element {
	const shownLog = useShownLog(log);

	const { goToPrev, goToNext, isPrevDisabled, isNextDisabled } =
		useLogNavigation({
			logs,
			activeLogId: shownLog?.id ?? '',
			onNavigateLog,
			onScrollToLog,
		});

	const title = useLogTimestamp(shownLog);

	return (
		<Drawer
			type="inspector"
			stack="overlay"
			open={log !== null}
			onClose={onClose}
			title={title}
			width="extra-wide"
			closePosition="start"
			headerSuffix={
				<>
					{shownLog && (
						<LogActions
							log={shownLog}
							showOpenInExplorer={!!handleOpenInExplorer}
							onOpenInExplorer={handleOpenInExplorer}
						/>
					)}
					<LogNavigation
						onNavigatePrev={goToPrev}
						onNavigateNext={goToNext}
						isPrevDisabled={isPrevDisabled}
						isNextDisabled={isNextDisabled}
					/>
				</>
			}
			testId="log-detail-drawer"
		>
			{shownLog && (
				<LogDetailBody
					log={shownLog}
					onClose={onClose}
					selectedTab={selectedTab}
					isListViewPanel={isListViewPanel}
					handleChangeSelectedView={handleChangeSelectedView}
					onApplyLogFilter={onApplyLogFilter}
					onPrev={goToPrev}
					onNext={goToNext}
				/>
			)}
		</Drawer>
	);
}

export default LogDetail;

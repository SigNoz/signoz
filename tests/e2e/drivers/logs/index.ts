import { driver, kit, type Layer } from '../kit';

import { logsExplorerDriver, type LogsExplorer } from './explorer';
import { pipelinesDriver, type Pipelines } from './pipelines';
import { logsRailDriver, type LogsRail } from './rail';
import { withLogsSeed } from './seed';
import { logsViewsDriver, type LogsViews } from './views';

export const withLogs: Layer<{
	logs: LogsExplorer;
	views: LogsViews;
	pipelines: Pipelines;
	logsRail: LogsRail;
}> = (base) =>
	driver('logsRail', ({ page }) => logsRailDriver(page))(
		driver('pipelines', ({ page }) => pipelinesDriver(page))(
			driver('views', ({ page }) => logsViewsDriver(page))(
				driver('logs', ({ page }) => logsExplorerDriver(page))(base),
			),
		),
	);

/**
 * The logs `test`: explorer, detail drawer, live tail, saved views, pipelines
 * and the quick-filters rail, over one worker-scoped seed (`logsSeed`).
 */
export const test = withLogs(withLogsSeed(kit));

export { expect, SEEDED_DATA_TIMEOUT } from '../kit';
export {
	LINKED_ROW_CLASS,
	LOGS_EXPLORER_PATH,
	logsExplorerDriver,
	type LogsExplorer,
	type LogsFormat,
	type LogsView,
} from './explorer';
export type { DetailTab, FieldAction, LogDetail } from './detail';
export type { LiveTail } from './liveTail';
export {
	servicePipeline,
	type PipelineInput,
	type Pipelines,
} from './pipelines';
export type { LogsRail } from './rail';
export { lineBody, serviceFilter, sideService, type LogsSeed } from './seed';
export type { LogsViews } from './views';

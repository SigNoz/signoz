/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	AlertmanagertypesMaintenanceKindDTO,
	AlertmanagertypesMaintenanceStatusDTO,
	AlertmanagertypesRepeatOnDTO,
	AlertmanagertypesRepeatTypeDTO,
	type AlertmanagertypesPlannedMaintenanceDTO,
	type ListDowntimeSchedules200,
} from 'api/generated/services/sigNoz.schemas';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const at = (offsetMs: number): string =>
	new Date(Date.now() + offsetMs).toISOString();

export const DOWNTIME_KINDS = ['mixed', 'fixed', 'recurring'] as const;

export type DowntimeKind = (typeof DOWNTIME_KINDS)[number];

interface DowntimeSeed {
	name: string;
	description: string;
	kind: AlertmanagertypesMaintenanceKindDTO;
	status: AlertmanagertypesMaintenanceStatusDTO;
	timezone: string;
	/** Relative to now, so a story always has a live, an upcoming and a past one. */
	startsInMs: number;
	lastsMs: number;
	repeatType?: AlertmanagertypesRepeatTypeDTO;
	repeatOn?: AlertmanagertypesRepeatOnDTO[];
	/** Rule ids from the shared alert seeds; empty silences every rule. */
	alertIds: string[];
}

const SEEDS: DowntimeSeed[] = [
	{
		name: 'Postgres major version upgrade',
		description: 'Primary and replicas are cycled one at a time.',
		kind: AlertmanagertypesMaintenanceKindDTO.fixed,
		status: AlertmanagertypesMaintenanceStatusDTO.active,
		timezone: 'UTC',
		startsInMs: -2 * HOUR,
		lastsMs: 6 * HOUR,
		alertIds: ['rule-5', 'rule-3'],
	},
	{
		name: 'Nightly ETL window',
		description:
			'The warehouse load runs every night and saturates the ingesters.',
		kind: AlertmanagertypesMaintenanceKindDTO.recurring,
		status: AlertmanagertypesMaintenanceStatusDTO.upcoming,
		timezone: 'Europe/Berlin',
		startsInMs: 8 * HOUR,
		lastsMs: 3 * HOUR,
		repeatType: AlertmanagertypesRepeatTypeDTO.daily,
		alertIds: ['rule-12'],
	},
	{
		name: 'Weekend cluster drain',
		description: 'Nodes are drained for kernel patching.',
		kind: AlertmanagertypesMaintenanceKindDTO.recurring,
		status: AlertmanagertypesMaintenanceStatusDTO.upcoming,
		timezone: 'America/New_York',
		startsInMs: 3 * DAY,
		lastsMs: 4 * HOUR,
		repeatType: AlertmanagertypesRepeatTypeDTO.weekly,
		repeatOn: [
			AlertmanagertypesRepeatOnDTO.saturday,
			AlertmanagertypesRepeatOnDTO.sunday,
		],
		alertIds: [],
	},
	{
		name: 'Checkout release freeze',
		description: 'Deploy window for the checkout rewrite.',
		kind: AlertmanagertypesMaintenanceKindDTO.fixed,
		status: AlertmanagertypesMaintenanceStatusDTO.expired,
		timezone: 'UTC',
		startsInMs: -9 * DAY,
		lastsMs: 2 * HOUR,
		alertIds: ['rule-1', 'rule-2'],
	},
	{
		name: 'Kafka broker rebalance',
		description: 'Partitions move between brokers, lag spikes are expected.',
		kind: AlertmanagertypesMaintenanceKindDTO.fixed,
		status: AlertmanagertypesMaintenanceStatusDTO.upcoming,
		timezone: 'Asia/Kolkata',
		startsInMs: 26 * HOUR,
		lastsMs: 90 * MINUTE,
		alertIds: ['rule-4'],
	},
	{
		name: 'Monthly billing reconciliation',
		description: 'Batch jobs run long on the first of the month.',
		kind: AlertmanagertypesMaintenanceKindDTO.recurring,
		status: AlertmanagertypesMaintenanceStatusDTO.upcoming,
		timezone: 'UTC',
		startsInMs: 5 * DAY,
		lastsMs: 12 * HOUR,
		repeatType: AlertmanagertypesRepeatTypeDTO.monthly,
		alertIds: ['rule-9'],
	},
];

export const DOWNTIME_MAX = SEEDS.length;

/** The list sorts by last update, and the seeds are built newest first. */
export const FIRST_DOWNTIME_NAME = SEEDS[0].name;

const durationLabel = (ms: number): string =>
	ms % HOUR === 0 ? `${ms / HOUR}h0m0s` : `${Math.round(ms / MINUTE)}m0s`;

const buildSchedule = (
	index: number,
	kind: DowntimeKind,
): AlertmanagertypesPlannedMaintenanceDTO => {
	const seed = SEEDS[index % SEEDS.length];
	const resolvedKind =
		kind === 'mixed' ? seed.kind : (kind as AlertmanagertypesMaintenanceKindDTO);
	const isRecurring =
		resolvedKind === AlertmanagertypesMaintenanceKindDTO.recurring;

	return {
		id: `downtime-${index + 1}`,
		name: seed.name,
		description: seed.description,
		kind: resolvedKind,
		status: seed.status,
		alertIds: seed.alertIds,
		createdAt: at(-(index + 4) * DAY),
		createdBy: 'ada@signoz.io',
		updatedAt: at(-(index + 1) * DAY),
		updatedBy: 'grace@signoz.io',
		schedule: {
			timezone: seed.timezone,
			startTime: at(seed.startsInMs),
			endTime: isRecurring ? undefined : at(seed.startsInMs + seed.lastsMs),
			recurrence: isRecurring
				? {
						duration: durationLabel(seed.lastsMs),
						repeatType: seed.repeatType ?? AlertmanagertypesRepeatTypeDTO.daily,
						repeatOn: seed.repeatOn ?? null,
					}
				: undefined,
		},
	};
};

export const downtimeSchedulesResponse = (
	count: number,
	kind: DowntimeKind,
): ListDowntimeSchedules200 => ({
	status: 'success',
	data: Array.from({ length: count }, (_unused, index) =>
		buildSchedule(index, kind),
	),
});

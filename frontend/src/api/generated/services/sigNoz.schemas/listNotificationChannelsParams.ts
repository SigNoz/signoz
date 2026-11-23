/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelKindDTO } from './alertmanagertypesChannelKindDTO';
import type { AlertmanagertypesChannelListOrderDTO } from './alertmanagertypesChannelListOrderDTO';
import type { AlertmanagertypesChannelListSortDTO } from './alertmanagertypesChannelListSortDTO';

export type ListNotificationChannelsParams = {
	/**
	 * @type string
	 * @description Case-insensitive match on the display name; at most 1024 characters.
	 */
	query?: string;
	/**
	 * @description Only channels of this provider kind.
	 */
	kind?: AlertmanagertypesChannelKindDTO;
	/**
	 * @description The sort column: updated_at (default), created_at or name.
	 */
	sort?: AlertmanagertypesChannelListSortDTO;
	/**
	 * @description The sort order: asc or desc (default).
	 */
	order?: AlertmanagertypesChannelListOrderDTO;
	/**
	 * @type integer
	 * @description The page size; defaults to 20 and is capped at 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of channels to skip; defaults to 0.
	 */
	offset?: number;
};

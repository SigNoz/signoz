import { DashboardtypesPrecisionOptionDTO } from 'api/generated/services/sigNoz.schemas';

import type { ConfigTileItem } from '../../controls/ConfigTiles/ConfigTiles';

/** What an unset precision renders with. */
export const DEFAULT_DECIMAL_PRECISION =
	DashboardtypesPrecisionOptionDTO.NUMBER_2;

export const DECIMALS_PREVIEW_VALUE = 1234.56789;

export const DECIMAL_OPTIONS: ConfigTileItem<DashboardtypesPrecisionOptionDTO>[] =
	[
		{ value: DashboardtypesPrecisionOptionDTO.NUMBER_0, label: '0' },
		{ value: DashboardtypesPrecisionOptionDTO.NUMBER_1, label: '1' },
		{ value: DashboardtypesPrecisionOptionDTO.NUMBER_2, label: '2' },
		{ value: DashboardtypesPrecisionOptionDTO.NUMBER_3, label: '3' },
		{ value: DashboardtypesPrecisionOptionDTO.NUMBER_4, label: '4' },
		{ value: DashboardtypesPrecisionOptionDTO.full, label: 'Full' },
	];

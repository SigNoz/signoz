import { PANEL_TYPES } from 'constants/queryBuilder';

import HistogramPanelWrapper from './HistogramPanelWrapper';
import ListPanelWrapper from './ListPanelWrapper';
import PiePanelWrapper from './PiePanelWrapper';
import TablePanelWrapper from './TablePanelWrapper';
import UplotPanelWrapper from './UplotPanelWrapper';
import ValuePanelWrapper from './ValuePanelWrapper';

export const PanelTypeVsPanelWrapper = {
	[PANEL_TYPES.TIME_SERIES]: UplotPanelWrapper,
	[PANEL_TYPES.TABLE]: TablePanelWrapper,
	[PANEL_TYPES.LIST]: ListPanelWrapper,
	[PANEL_TYPES.VALUE]: ValuePanelWrapper,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
	[PANEL_TYPES.PIE]: PiePanelWrapper,
	[PANEL_TYPES.BAR]: UplotPanelWrapper,
	[PANEL_TYPES.HISTOGRAM]: HistogramPanelWrapper,
};

export const DEFAULT_BUCKET_COUNT = 30;

// prettier-ignore
export const histogramBucketSizes = [
    1e-9,  2e-9,  2.5e-9,  4e-9,  5e-9,
    1e-8,  2e-8,  2.5e-8,  4e-8,  5e-8,
    1e-7,  2e-7,  2.5e-7,  4e-7,  5e-7,
    1e-6,  2e-6,  2.5e-6,  4e-6,  5e-6,
    1e-5,  2e-5,  2.5e-5,  4e-5,  5e-5,
    1e-4,  2e-4,  2.5e-4,  4e-4,  5e-4,
    1e-3,  2e-3,  2.5e-3,  4e-3,  5e-3,
    1e-2,  2e-2,  2.5e-2,  4e-2,  5e-2,
    1e-1,  2e-1,  2.5e-1,  4e-1,  5e-1,
    1,     2,              4,     5,
    1e+1,  2e+1,  2.5e+1,  4e+1,  5e+1,
    1e+2,  2e+2,  2.5e+2,  4e+2,  5e+2,
    1e+3,  2e+3,  2.5e+3,  4e+3,  5e+3,
    1e+4,  2e+4,  2.5e+4,  4e+4,  5e+4,
    1e+5,  2e+5,  2.5e+5,  4e+5,  5e+5,
    1e+6,  2e+6,  2.5e+6,  4e+6,  5e+6,
    1e+7,  2e+7,  2.5e+7,  4e+7,  5e+7,
    1e+8,  2e+8,  2.5e+8,  4e+8,  5e+8,
    1e+9,  2e+9,  2.5e+9,  4e+9,  5e+9,
  ];

export const NULL_REMOVE = 0;
export const NULL_RETAIN = 1;
export const NULL_EXPAND = 2;

import { themeColors } from 'constants/theme';
import { SIGNOZ_UI_COLOR_HEX } from 'lib/getRandomColor';
import { Span } from 'types/api/trace/getTraceItem';

const spans: Span[] = [
	[
		1,
		'span1',
		'trace1',
		'serviceA',
		'op1',
		'100',
		'200',
		[SIGNOZ_UI_COLOR_HEX],
		[themeColors.chartcolors.turquoise],
		[''],
		[''],
		false,
	],
	[
		2,
		'span2',
		'trace2',
		'serviceB',
		'op2',
		'200',
		'300',
		[SIGNOZ_UI_COLOR_HEX],
		[themeColors.chartcolors.turquoise],
		[''],
		[''],
		false,
	],
	[
		3,
		'span3',
		'trace3',
		'serviceC',
		'op3',
		'300',
		'400',
		[],
		[],
		[''],
		[''],
		false,
	],
];

export default spans;

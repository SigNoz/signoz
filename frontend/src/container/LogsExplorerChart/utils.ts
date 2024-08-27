// import { LogType } from 'components/Logs/LogStateIndicator/LogStateIndicator';
// import { getLogTypeBySeverityNumber } from 'components/Logs/LogStateIndicator/utils';
import { Color } from '@signozhq/design-tokens';
// import { QueryData } from 'types/api/widgets/getQuery';

// export function convertSeverityNumberToSeverityText(
// 	data: QueryData[],
// ): QueryData[] {
// 	console.log(data);
// 	const dataWithSeverityText = [
// 		{
// 			metric: {
// 				severity_text: LogType.UNKNOWN,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},
// 		{
// 			metric: {
// 				severity_text: LogType.TRACE,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},
// 		{
// 			metric: {
// 				severity_text: LogType.DEBUG,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},
// 		{
// 			metric: {
// 				severity_text: LogType.INFO,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},

// 		{
// 			metric: {
// 				severity_text: LogType.WARN,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},
// 		{
// 			metric: {
// 				severity_text: LogType.ERROR,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},
// 		{
// 			metric: {
// 				severity_text: LogType.FATAL,
// 			},
// 			values: [],
// 			queryName: 'A',
// 			legend: '',
// 		},
// 	];
// 	data.forEach((series) => {
// 		const severityText = getLogTypeBySeverityNumber(
// 			Number(series?.metric?.severity_number),
// 		);
// 	});
// 	return dataWithSeverityText;
// }

export function getColorsForSeverityLabels(label: string): string {
	switch (label) {
		case '{severity_text="TRACE"}':
			return Color.BG_ROBIN_300;
		case '{severity_text="DEBUG"}':
			return Color.BG_FOREST_500;
		case '{severity_text="INFO"}':
			return Color.BG_SLATE_400;
		case '{severity_text="WARN"}':
			return Color.BG_AMBER_500;
		case '{severity_text="ERROR"}':
			return Color.BG_CHERRY_500;
		case '{severity_text="FATAL"}':
			return Color.BG_SAKURA_500;
		default:
			return Color.BG_SLATE_200;
	}
}

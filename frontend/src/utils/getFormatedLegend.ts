export const getFormatedLegend = (value: string): string =>
	value.replace(/\{\s*\{\s*(.*?)\s*\}\s*\}/g, '{{$1}}');

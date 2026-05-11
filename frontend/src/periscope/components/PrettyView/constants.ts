// Dark theme — SigNoz design palette
export const darkTheme = {
	scheme: 'signoz-dark',
	author: 'signoz',
	base00: 'transparent',
	base01: '#161922',
	base02: '#1d212d',
	base03: '#62687C',
	base04: '#ADB4C2',
	base05: '#ADB4C2',
	base06: '#ADB4C2',
	base07: '#ADB4C2',
	base08: '#EA6D71',
	base09: '#7CEDBD',
	base0A: '#7CEDBD',
	base0B: '#ADB4C2',
	base0C: '#23C4F8',
	base0D: '#95ACFB',
	base0E: '#95ACFB',
	base0F: '#AD7F58',
};

// Light theme
export const lightTheme = {
	scheme: 'signoz-light',
	author: 'signoz',
	base00: 'transparent',
	base01: '#F9F9FB',
	base02: '#EFF0F3',
	base03: '#80828D',
	base04: '#62636C',
	base05: '#62636C',
	base06: '#62636C',
	base07: '#1E1F24',
	base08: '#E5484D',
	base09: '#168757',
	base0A: '#168757',
	base0B: '#62636C',
	base0C: '#157594',
	base0D: '#2F48A0',
	base0E: '#2F48A0',
	base0F: '#684C35',
};

export const themeExtension = {
	value: ({
		style,
	}: {
		style: Record<string, unknown>;
	}): { style: Record<string, unknown>; className: string } => ({
		style: { ...style },
		className: 'pretty-view__row',
	}),
	nestedNode: ({
		style,
	}: {
		style: Record<string, unknown>;
	}): { style: Record<string, unknown>; className: string } => ({
		style: { ...style },
		className: 'pretty-view__nested-row',
	}),
};

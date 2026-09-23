const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// Folder names keep the casing the author typed — only the first letter is forced
// up — so acronyms like `LLMObservability` survive. Separated names
// (`api-monitoring`, `api monitoring`) collapse to PascalCase.
export function toDirName(value) {
	const name = value.trim().replace(/[^a-zA-Z0-9\-_ ]/g, '');
	if (!name) {
		throw new Error(`"${value}" has no usable name characters`);
	}
	return /[-_\s]/.test(name)
		? name
				.split(/[-_\s]+/)
				.filter(Boolean)
				.map(capitalize)
				.join('')
		: capitalize(name);
}

const splitHumps = (name, separator) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, `$1${separator}$2`)
		.replace(/([A-Z]+)([A-Z][a-z])/g, `$1${separator}$2`);

export const toKebab = (value) => splitHumps(toDirName(value), '-').toLowerCase();
export const toTitle = (value) => splitHumps(toDirName(value), ' ');
export const toConst = (value) => toKebab(value).replace(/-/g, '_').toUpperCase();
export const toCamel = (value) => {
	const dir = toDirName(value);
	return dir.charAt(0).toLowerCase() + dir.slice(1);
};

export function tokensFor(name) {
	return {
		__Pascal__: toDirName(name),
		__kebab__: toKebab(name),
		__camel__: toCamel(name),
		__CONST__: toConst(name),
		__Title__: toTitle(name),
	};
}

export function substitute(text, tokens) {
	return Object.entries(tokens).reduce(
		(acc, [token, value]) => acc.split(token).join(value),
		text,
	);
}

export const routeKey = (segments, view) =>
	[...segments, ...(view ? [view] : [])].map(toConst).join('_');
export const routePath = (segments, view) =>
	`/${[...segments, ...(view ? [view] : [])].map(toKebab).join('/')}`;

// Every path under a shell renders the shell itself (RouteTab picks the tab, the base path
// redirects to the first tab), so the page component is always the first segment.
export function routeSpec(segments, views) {
	const shell = segments[0];
	const component = {
		name: `${shell}Page`,
		importPath: `pages/${shell}`,
		chunk: `${toTitle(shell)} Page`,
	};
	if (views.length) {
		const tabs = views.map((view) => ({
			key: routeKey(segments, view),
			path: routePath(segments, view),
		}));
		const keys = [
			{ key: `${routeKey(segments)}_BASE`, path: routePath(segments) },
			...tabs,
		];
		return { component, keys, routed: keys.map(({ key }) => key) };
	}
	const key = routeKey(segments);
	return { component, keys: [{ key, path: routePath(segments) }], routed: [key] };
}

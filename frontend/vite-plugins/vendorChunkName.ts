const NODE_MODULES = 'node_modules/';

export function vendorChunkName(moduleId: string): string | null {
	const start = moduleId.lastIndexOf(NODE_MODULES);
	if (start < 0) {
		return null;
	}

	const [first, second] = moduleId.slice(start + NODE_MODULES.length).split('/');
	const packageName = first.startsWith('@') ? `${first}-${second}` : first;

	return `v-${packageName.replace(/[^A-Za-z0-9_.-]/g, '-')}`;
}

// TypeScript 7 ships no JS compiler API. Tools that call it (ts-jest, ts-node,
// storybook docgen, cosmiconfig, ...) would resolve their `typescript` peer to
// the root 7.x, so give them a real dependency on the 6.x API instead.
const TS6 = 'npm:@typescript/typescript6@6.0.2';
const KEEP_TS7 = new Set(['frontend', 'vite-plugin-checker']);

function readPackage(pkg) {
	if (KEEP_TS7.has(pkg.name)) {
		return pkg;
	}
	const usesTs =
		pkg.peerDependencies?.typescript || pkg.dependencies?.typescript;
	if (!usesTs) {
		return pkg;
	}
	delete pkg.peerDependencies?.typescript;
	delete pkg.peerDependenciesMeta?.typescript;
	pkg.dependencies = { ...pkg.dependencies, typescript: TS6 };
	return pkg;
}

module.exports = { hooks: { readPackage } };

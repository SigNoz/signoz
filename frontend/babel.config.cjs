module.exports = {
	presets: [
		['@babel/preset-env', { modules: 'auto' }],
		['@babel/preset-react', { runtime: 'automatic' }],
		['@babel/preset-typescript'],
	],
	plugins: ['@babel/plugin-proposal-class-properties'],
	env: {
		test: {
			presets: [
				[
					'@babel/preset-env',
					{ modules: 'commonjs', targets: { node: 'current' } },
				],
				['@babel/preset-react', { runtime: 'automatic' }],
				['@babel/preset-typescript'],
			],
		},
	},
};

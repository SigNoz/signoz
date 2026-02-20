// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
module.exports = (api) => {
	api.cache.using(() => process.env.NODE_ENV);

	return {
		presets: [
			'@babel/preset-env',
			'@babel/preset-typescript',
			[
				'@babel/preset-react',
				{ development: !api.env('production'), runtime: 'automatic' },
			],
		],
		plugins: [
			'react-hot-loader/babel',
			'@babel/plugin-proposal-class-properties',
			...(api.env('production') ? [] : ['react-refresh/babel']),
		],
		env: {
			production: {
				presets: ['minify'],
			},
		},
	};
};

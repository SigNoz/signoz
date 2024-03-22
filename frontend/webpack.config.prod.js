/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// shared config (dev and prod)
const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const dotenv = require('dotenv');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const Critters = require('critters-webpack-plugin');
const fs = require('fs');

// dotenv.config();
const envFile = `.env.${process.env.NODE_ENV}`;

// 确保文件存在，否则回退到默认的 .env 文件
const finalPath = fs.existsSync(envFile) ? envFile : '.env';
const env = dotenv.config({
	path: finalPath,
}).parsed;

// 转换加载的环境变量为 DefinePlugin 需要的格式
const envKeys = env
	? {
			'process.env': Object.keys(env).reduce((acc, key) => {
				acc[key] = JSON.stringify(env[key]);
				return acc;
			}, {}),
	  }
	: {};

const cssLoader = 'css-loader';
const sassLoader = 'sass-loader';
const styleLoader = 'style-loader';

const plugins = [
	new HtmlWebpackPlugin({
		template: 'src/index.html.ejs',
		INTERCOM_APP_ID: process.env.INTERCOM_APP_ID,
		SEGMENT_ID: process.env.SEGMENT_ID,
		CLARITY_PROJECT_ID: process.env.CLARITY_PROJECT_ID,
	}),
	new CompressionPlugin({
		exclude: /.map$/,
	}),
	new CopyPlugin({
		patterns: [{ from: resolve(__dirname, 'public/'), to: '.' }],
	}),
	new webpack.ProvidePlugin({
		process: 'process/browser',
	}),
	new webpack.DefinePlugin(
		// {
		// 	'process.env': JSON.stringify({
		// 		FRONTEND_API_ENDPOINT: process.env.FRONTEND_API_ENDPOINT,
		// 		INTERCOM_APP_ID: process.env.INTERCOM_APP_ID,
		// 		SEGMENT_ID: process.env.SEGMENT_ID,
		// 		CLARITY_PROJECT_ID: process.env.CLARITY_PROJECT_ID,
		// 	}),
		// }
		envKeys,
	),
	new MiniCssExtractPlugin(),
	new Critters({
		preload: 'swap',
		// Base path location of the CSS files
		path: resolve(__dirname, './build/css'),
		// Public path of the CSS resources. This prefix is removed from the href
		publicPath: resolve(__dirname, './public/css'),
		fonts: true,
	}),
];

if (process.env.BUNDLE_ANALYSER === 'true') {
	plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'server' }));
}

const config = {
	mode: 'production',
	entry: resolve(__dirname, './src/index.tsx'),
	output: {
		path: resolve(__dirname, './build'),
		publicPath: '/',
		filename: '[name].[contenthash].js',
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
		plugins: [new TsconfigPathsPlugin({})],
		fallback: { 'process/browser': require.resolve('process/browser') },
	},
	cache: {
		type: 'filesystem',
		allowCollectingMemory: true,
		cacheDirectory: resolve(__dirname, '.temp_cache'),
		buildDependencies: {
			// This makes all dependencies of this file - build dependencies
			config: [__filename],
			// By default webpack and loaders are build dependencies
		},
	},

	module: {
		rules: [
			{
				test: [/\.jsx?$/, /\.tsx?$/],
				use: ['babel-loader'],
				exclude: /node_modules/,
			},
			{
				test: /\.md$/,
				use: 'raw-loader',
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: cssLoader,
						options: {
							modules: true,
						},
					},
				],
			},
			{
				test: /\.s[ac]ss$/i,
				use: [
					// Creates `style` nodes from JS strings
					styleLoader,
					// Translates CSS into CommonJS
					cssLoader,
					// Compiles Sass to CSS
					sassLoader,
				],
			},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				use: [
					'file-loader?hash=sha512&digest=hex&name=img/[chunkhash].[ext]',
					'image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false',
				],
			},
			{
				test: /\.(ttf|eot|woff|woff2)$/,
				use: ['file-loader'],
			},
			{
				test: /\.less$/i,
				use: [
					{
						loader: styleLoader,
					},
					{
						loader: cssLoader,
						options: {
							modules: true,
						},
					},
					{
						loader: 'less-loader',
						options: {
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
		],
	},
	plugins,
	// 开启source map
	devtool: 'source-map',
	optimization: {
		chunkIds: 'named',
		concatenateModules: false,
		emitOnErrors: true,
		flagIncludedChunks: true,
		innerGraph: true, // tells webpack whether to conduct inner graph analysis for unused exports.
		mangleWasmImports: true,
		mergeDuplicateChunks: true,
		minimize: true,
		nodeEnv: 'production',
		runtimeChunk: {
			name: (entrypoint) => `runtime~${entrypoint.name}`,
		},
		minimizer: [
			new TerserPlugin({
				parallel: true,
				terserOptions: {
					// compress: true,
					compress: false,
					keep_classnames: true,
					// keep_fnames: false,
					keep_fnames: true,
					sourceMap: true,
					safari10: true,
					parse: {
						html5_comments: false,
					},
				},
			}),
			new CssMinimizerPlugin(),
		],
	},
	performance: {
		hints: 'warning',
	},
};

module.exports = config;

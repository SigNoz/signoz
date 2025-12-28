/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// shared config (dev and prod)
const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const dotenv = require('dotenv');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { RetryChunkLoadPlugin } = require('webpack-retry-chunk-load-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

dotenv.config();

const cssLoader = 'css-loader';
const sassLoader = 'sass-loader';
const styleLoader = 'style-loader';

const plugins = [
	new HtmlWebpackPlugin({
		template: 'src/index.html.ejs',
		PYLON_APP_ID: process.env.PYLON_APP_ID,
		APPCUES_APP_ID: process.env.APPCUES_APP_ID,
		POSTHOG_KEY: process.env.POSTHOG_KEY,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT_ID: process.env.SENTRY_PROJECT_ID,
		SENTRY_DSN: process.env.SENTRY_DSN,
		TUNNEL_URL: process.env.TUNNEL_URL,
		TUNNEL_DOMAIN: process.env.TUNNEL_DOMAIN,
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
	new webpack.DefinePlugin({
		'process.env': JSON.stringify({
			FRONTEND_API_ENDPOINT: process.env.FRONTEND_API_ENDPOINT,
			WEBSOCKET_API_ENDPOINT: process.env.WEBSOCKET_API_ENDPOINT,
			PYLON_APP_ID: process.env.PYLON_APP_ID,
			PYLON_IDENTITY_SECRET: process.env.PYLON_IDENTITY_SECRET,
			APPCUES_APP_ID: process.env.APPCUES_APP_ID,
			POSTHOG_KEY: process.env.POSTHOG_KEY,
			SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
			SENTRY_ORG: process.env.SENTRY_ORG,
			SENTRY_PROJECT_ID: process.env.SENTRY_PROJECT_ID,
			SENTRY_DSN: process.env.SENTRY_DSN,
			TUNNEL_URL: process.env.TUNNEL_URL,
			TUNNEL_DOMAIN: process.env.TUNNEL_DOMAIN,
			DOCS_BASE_URL: process.env.DOCS_BASE_URL,
		}),
	}),
	new MiniCssExtractPlugin(),
	sentryWebpackPlugin({
		authToken: process.env.SENTRY_AUTH_TOKEN,
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT_ID,
	}),
	new RetryChunkLoadPlugin({
		maxRetries: 2,
	}),
];

if (process.env.BUNDLE_ANALYSER === 'true') {
	plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'server' }));
}

const config = {
	mode: 'production',
	devtool: 'source-map',
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
				type: 'asset',
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
	optimization: {
		chunkIds: 'named',
		concatenateModules: true, // Enable module concatenation for better tree-shaking and smaller bundles
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
		splitChunks: {
			chunks: 'all',
			maxInitialRequests: 30,
			minSize: 20000,
			cacheGroups: {
				// Vendor libraries - React, React-DOM, Redux, Router
				vendor: {
					test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|react-redux|redux|@reduxjs)[\\/]/,
					name: 'vendors-react',
					priority: 30,
					reuseExistingChunk: true,
					enforce: true,
				},
				// Ant Design icons (separate from core - icons are huge)
				antdIcons: {
					test: /[\\/]node_modules[\\/](@ant-design\/icons)[\\/]/,
					name: 'vendors-antd-icons',
					priority: 25,
					reuseExistingChunk: true,
					enforce: true,
				},
				// Ant Design core (without icons) - matches antd and @ant-design but not @ant-design/icons
				antd: {
					test: /[\\/]node_modules[\\/](antd|@ant-design(?!\/icons))[\\/]/,
					name: 'vendors-antd',
					priority: 20,
					reuseExistingChunk: true,
					enforce: true,
				},
				// SigNoz UI components
				signozhq: {
					test: /[\\/]node_modules[\\/](@signozhq)[\\/]/,
					name: 'vendors-signozhq',
					priority: 19,
					reuseExistingChunk: true,
					enforce: true,
				},
				// Chart libraries
				charts: {
					test: /[\\/]node_modules[\\/](uplot|chart\.js|@visx|@tanstack\/react-table|@tanstack\/react-virtual)[\\/]/,
					name: 'vendors-charts',
					priority: 18,
					reuseExistingChunk: true,
					enforce: true,
				},
				// React Query
				reactQuery: {
					test: /[\\/]node_modules[\\/](react-query|@tanstack\/react-query)[\\/]/,
					name: 'vendors-react-query',
					priority: 17,
					reuseExistingChunk: true,
					enforce: true,
				},
				// Large utility libraries
				utilities: {
					test: /[\\/]node_modules[\\/](lodash-es|@dnd-kit|dayjs|axios|i18next)[\\/]/,
					name: 'vendors-utilities',
					priority: 15,
					reuseExistingChunk: true,
					enforce: true,
				},
				// Monaco editor (very large)
				monaco: {
					test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor)[\\/]/,
					name: 'vendors-monaco',
					priority: 16,
					reuseExistingChunk: true,
					enforce: true,
				},
				// Other vendor libraries
				common: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors-common',
					priority: 10,
					minChunks: 2,
					reuseExistingChunk: true,
				},
			},
		},
		minimizer: [
			new TerserPlugin({
				parallel: true,
				terserOptions: {
					compress: true,
					keep_classnames: true,
					keep_fnames: false,
					sourceMap: false,
					safari10: true,
					parse: {
						html5_comments: false,
					},
				},
			}),
			new CssMinimizerPlugin(),
			new ImageMinimizerPlugin({
				minimizer: [
					{
						implementation: ImageMinimizerPlugin.sharpMinify,
						options: {
							encodeOptions: {
								jpeg: {
									quality: 80,
								},
								webp: {
									lossless: true,
								},
								avif: {
									lossless: true,
								},
								png: {},
								gif: {},
							},
						},
					},
					{
						implementation: ImageMinimizerPlugin.imageminMinify,
						options: {
							plugins: [
								[
									'svgo',
									{
										plugins: [
											{
												name: 'preset-default',
												params: {
													overrides: {
														removeViewBox: false,
														addAttributesToSVGElement: {
															params: {
																attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
															},
														},
													},
												},
											},
										],
									},
								],
							],
						},
					},
				],
			}),
		],
	},
	performance: {
		hints: 'warning',
	},
};

module.exports = config;

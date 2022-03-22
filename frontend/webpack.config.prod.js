/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// shared config (dev and prod)
import CompressionPlugin from 'compression-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { dirname, resolve } from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const filname = fileURLToPath(import.meta.url);
const directoryName = dirname(filname);

const { DefinePlugin, ProvidePlugin } = webpack;

const plugins = [
	new HtmlWebpackPlugin({ template: 'src/index.html.ejs' }),
	new CompressionPlugin({
		exclude: /.map$/,
	}),
	new CopyPlugin({
		patterns: [{ from: resolve(directoryName, 'public/'), to: '.' }],
	}),
	new ProvidePlugin({
		process: 'process/browser',
	}),
	new DefinePlugin({
		'process.env': JSON.stringify(process.env),
	}),
	new MiniCssExtractPlugin(),
];

if (process.env.BUNDLE_ANALYSER === 'true') {
	plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'server' }));
}

/** @type { import('webpack').Configuration } */
const config = {
	mode: 'production',
	entry: resolve(directoryName, './src/index.tsx'),
	output: {
		path: resolve(directoryName, './build'),
		publicPath: '/',
		filename: '[name].[contenthash].js',
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
		plugins: [new TsconfigPathsPlugin({})],
	},
	cache: {
		type: 'filesystem',
		allowCollectingMemory: true,
		cacheDirectory: resolve(directoryName, '.temp_cache'),
		buildDependencies: {
			// This makes all dependencies of this file - build dependencies
			config: [filname],
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
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
						options: {
							modules: true,
						},
					},
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
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
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
		],
	},
	performance: {
		hints: 'warning',
	},
};

export default config;

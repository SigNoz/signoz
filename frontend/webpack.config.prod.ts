// shared config (dev and prod)
import CompressionPlugin from 'compression-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { resolve } from 'path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';
import { WebpackPluginInstance } from 'webpack-dev-middleware/node_modules/webpack';

const __dirname = resolve();

const config: webpack.Configuration = {
	mode: 'production',
	devtool: 'source-map',
	entry: resolve(__dirname, './src/index.tsx'),
	output: {
		filename: ({ chunk }: any): string => {
			const hash = chunk?.hash;
			const name = chunk?.name;
			return `js/${name}-${hash}.js`;
		},
		path: resolve(__dirname, './build'),
		publicPath: '/',
	},

	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
		plugins: [new TsconfigPathsPlugin({})],
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
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.(scss|sass)$/,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				use: [
					'file-loader?hash=sha512&digest=hex&name=img/[chunkhash].[ext]',
					'image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false',
				],
			},
		],
	},
	plugins: [
		new HtmlWebpackPlugin({ template: 'src/index.html.ejs' }),
		new CompressionPlugin({
			exclude: /.map$/,
		}) as any,
		new CopyPlugin({
			patterns: [{ from: resolve(__dirname, 'public/'), to: '.' }],
		}) as any,
		new webpack.ProvidePlugin({
			process: 'process/browser',
		}),
		new webpack.DefinePlugin({
			'process.env': JSON.stringify(process.env),
		}),
	],
	performance: {
		hints: false,
	},
};

export default config;
// shared config (dev and prod)
import dotenv from 'dotenv';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { resolve } from 'path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';

// @ts-ignore
import portFinderSync from 'portfinder-sync';

dotenv.config();

const __dirname = resolve();
console.log(resolve(__dirname, './src/'));

interface Configuration extends webpack.Configuration {
	devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = {
	mode: 'development',
	devtool: 'source-map',
	entry: resolve(__dirname, './src/index.tsx'),
	devServer: {
		historyApiFallback: true,
		open: true,
		hot: true,
		liveReload: true,
		port: portFinderSync.getPort(3000),
		static: {
			directory: resolve(__dirname, "public"),
			publicPath: "/",
			watch: true,
		}
	},
	target: 'web',
	output: {
		filename: ({ chunk }) => {
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
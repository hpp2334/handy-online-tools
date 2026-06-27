import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  mode: isDev ? 'development' : 'production',
  devtool: isDev ? 'eval-source-map' : false,
  entry: { main: './src/main.tsx' },
  output: {
    filename: '[name].[contenthash].js',
    assetModuleFilename: 'assets/[name].[hash][ext][query]',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  module: {
    rules: [
      {
        test: /\.(?:js|mjs|jsx|ts|tsx)$/,
        exclude: /[\\/]node_modules[\\/]/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            detectSyntax: 'auto',
            jsc: {
              transform: {
                react: {
                  runtime: 'automatic',
                  development: isDev,
                  refresh: isDev,
                },
              },
            },
          },
        },
      },
      {
        test: /\.css$/,
        type: 'css/auto',
        use: {
          loader: 'postcss-loader',
          options: {
            postcssOptions: { plugins: ['tailwindcss', 'autoprefixer'] },
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp|ico|woff2?|eot|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    isDev && new ReactRefreshRspackPlugin(),
    isDev && new rspack.HotModuleReplacementPlugin(),
  ].filter(Boolean),
  devServer: {
    port: 42591,
    host: 'localhost',
    hot: true,
    open: false,
    historyApiFallback: true,
    client: { overlay: { errors: true, warnings: false } },
  },
})

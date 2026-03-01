const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/** @type {import('webpack').Configuration[]} */
module.exports = [
  // Extension Host (Node.js target)
  {
    name: 'extension',
    target: 'node',
    mode: 'development',
    devtool: 'source-map',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    externals: {
      vscode: 'commonjs vscode',
      'node-pty': 'commonjs node-pty',
      'child_process': 'commonjs child_process',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
  },
  // Webview (web target)
  {
    name: 'webview',
    target: 'web',
    mode: 'development',
    devtool: 'source-map',
    entry: './webview/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist', 'webview'),
      filename: 'webview.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      fallback: {
        path: false,
        fs: false,
        os: false,
        crypto: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'webview.css',
      }),
    ],
  },
];

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: ['./src/main.ts'],
  mode: 'development',
  devServer: {
    port: 3000,
    historyApiFallback: true,
    client: {
      logging: 'none',
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [new HtmlWebpackPlugin({
    template: 'src/index.html',
    chunks: [],
  }),

  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
};

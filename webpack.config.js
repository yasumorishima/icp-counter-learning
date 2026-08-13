const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const CopyPlugin = require("copy-webpack-plugin"); // ← CopyPlugin の import を削除 (またはコメントアウト)
const Dotenv = require('dotenv-webpack');

// Canister ID を環境変数から取得する関数 (CommonJS形式)
function getCanisterIds() {
  try {
    const localCanisters = require(path.resolve(".dfx", "local", "canister_ids.json"));
    const prodCanisters = require(path.resolve("canister_ids.json")); // Production 用

    const network = process.env.DFX_NETWORK || "local";
    const canisters = network === "local" ? localCanisters : prodCanisters;

    const canisterIds = {};
    for (const canister in canisters) {
        canisterIds[`process.env.${canister.toUpperCase()}_CANISTER_ID`] =
           JSON.stringify(canisters[canister][network]);
    }
    return canisterIds;
  } catch (error) {
    console.log("No canister_ids.json found. Continuing production");
    return {};
  }
}
const canisterIds = getCanisterIds();

// Webpack 設定 (CommonJS形式)
module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const network = process.env.DFX_NETWORK || "local";

  // アセットキャニスターのソースディレクトリ内の index.html
  const frontend_entry = path.join("src", "todo_app_frontend", "src", "index.html");

  return {
    target: "web",
    mode: isDevelopment ? "development" : "production",
    entry: {
      index: path.join(__dirname, "src", "todo_app_frontend", "src", "index.js"),
    },
    devtool: isDevelopment ? "source-map" : false,
    optimization: {
      minimize: !isDevelopment,
    },
    resolve: {
      extensions: [".js", ".ts", ".json"],
      fallback: {
        assert: require.resolve("assert/"),
        buffer: require.resolve("buffer/"),
        events: require.resolve("events/"),
        stream: require.resolve("stream-browserify/"),
        util: require.resolve("util/"),
      },
    },
    output: {
      filename: "index.js",
      path: path.join(__dirname, "dist", "todo_app_frontend"), // ビルド出力先
    },
    module: {
      rules: [
        { test: /\.(ts|tsx)$/, loader: "ts-loader" },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] }
      ]
    },
    plugins: [
      // index.html を dist ディレクトリに生成
      new HtmlWebpackPlugin({
        template: path.join(__dirname, frontend_entry),
        cache: false,
      }),
      // ★★★ CopyPlugin のブロックを削除 ★★★
      // new CopyPlugin({
      //  patterns: [
      //    {
      //      from: path.join(__dirname, "src", "todo_app_frontend", "assets"),
      //      to: path.join(__dirname, "dist", "todo_app_frontend"),
      //      noErrorOnMissing: true
      //    },
      //  ],
      // }),
      new webpack.ProvidePlugin({
        Buffer: [require.resolve("buffer/"), "Buffer"],
        process: require.resolve("process/browser"),
      }),
      new Dotenv({
         path: path.resolve(__dirname, './.env'),
         systemvars: true
      }),
      new webpack.DefinePlugin({
        "process.env.DFX_NETWORK": JSON.stringify(network),
        // 版が変わったら、貯めてある古い画面を捨てさせるための印
        "process.env.BUILD_ID": JSON.stringify(String(Date.now())),
        ...canisterIds
      }),
    ],
    devServer: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4943",
          changeOrigin: true,
          pathRewrite: { "^/api": "/api" },
        },
      },
      static: path.resolve(__dirname, "src", "todo_app_frontend", "dist"), // dev server の参照先 (不要かも)
      hot: true,
      watchFiles: [path.resolve(__dirname, "src", "todo_app_frontend")],
      liveReload: true,
    },
  };
};

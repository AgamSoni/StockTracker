const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/yahoo-finance-api",
    createProxyMiddleware({
      target: "https://query2.finance.yahoo.com",
      changeOrigin: true,
      pathRewrite: { "^/yahoo-finance-api": "" },
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    })
  );
};


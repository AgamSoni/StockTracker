const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/yahoo-finance-api",
    createProxyMiddleware({
      target: "https://query1.finance.yahoo.com",
      changeOrigin: true,
      pathRewrite: { "^/yahoo-finance-api": "" },
    })
  );
};

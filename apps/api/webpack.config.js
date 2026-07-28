const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  // sharp is a native addon — keep it external so node loads the real binary
  const existing = config.externals;
  config.externals = [
    ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
    ({ request }, callback) => {
      if (request === 'sharp') {
        return callback(null, `commonjs ${request}`);
      }
      return callback();
    },
  ];
  return config;
});

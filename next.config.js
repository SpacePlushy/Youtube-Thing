/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  
  // Ensure environment variables are not exposed to client
  env: {},
  
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.optimization.minimize = true;
      
      // Ensure no server-side env vars leak to client in production
      if (!dev) {
        config.plugins = config.plugins || [];
        const webpack = require('webpack');
        config.plugins.push(
          new webpack.DefinePlugin({
            'process.env.OXYLABS_USERNAME': 'undefined',
            'process.env.OXYLABS_PASSWORD': 'undefined', 
            'process.env.CEREBRAS_API_KEY': 'undefined',
            'process.env.KV_URL': 'undefined',
            'process.env.KV_REST_API_TOKEN': 'undefined',
            'process.env.KV_REST_API_READ_ONLY_TOKEN': 'undefined',
            'process.env.REDIS_URL': 'undefined'
          })
        );
      }
    }
    return config;
  },
  
  // Disable development features in production
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    trailingSlash: false,
    generateEtags: false
  })
}

module.exports = nextConfig
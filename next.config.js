/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  },
  webpack: (config, { isServer }) => {
    // PDF.js configuration
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
      };
      
      // Ignore canvas on client side
      config.resolve.alias.canvas = false;
    }
    
    // Handle binary files and ignore canvas.node
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      type: 'asset/resource',
    });
    
    // Ignore canvas.node binary files
    config.externals = config.externals || {};
    config.externals.canvas = 'canvas';

    return config;
  },
}

module.exports = nextConfig 
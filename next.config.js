/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better PDF handling
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'pdfjs-dist']
  },
  
  webpack: (config, { isServer }) => {
    // Exclude problematic modules from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
      };
      
      // Ignore canvas and other node-specific modules in client builds
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
        'pdfjs-dist/build/pdf.worker.min.js': 'pdfjs-dist/build/pdf.worker.min.js'
      });
    }

    // Handle PDF.js worker configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.min.js': require.resolve('pdfjs-dist/build/pdf.worker.min.js'),
    };

    return config;
  },

  // Ensure proper handling of static files
  async headers() {
    return [
      {
        source: '/pdf.worker.min.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 
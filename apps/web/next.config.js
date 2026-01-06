/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    webpack: (config, { isServer }) => {
        // Ignore Windows system files that cause Watchpack EINVAL errors
        config.watchOptions = {
            ...config.watchOptions,
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/DumpStack.log.tmp',
                '**/System Volume Information/**',
                '**/pagefile.sys',
                '**/hiberfil.sys',
                '**/swapfile.sys',
                '**/$Recycle.Bin/**',
            ],
        };
        return config;
    },
    async rewrites() {
        // API_URL 환경변수가 설정되어 있으면 사용, 없으면 localhost:3001 (개발환경)
        const apiUrl = process.env.API_URL || 'http://localhost:3001';
        console.log(`[Next.js] API rewrite configured to: ${apiUrl}`);
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;


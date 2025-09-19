import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        // allowedDevOrigins: ["http://192.168.10.14:3000"],
        // Fix for lucide-react chunk loading issues with Turbopack
        optimizePackageImports: ['lucide-react'],
    },
};

export default nextConfig;

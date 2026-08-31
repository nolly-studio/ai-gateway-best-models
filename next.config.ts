import type { NextConfig } from "next"

import { SITE_ORIGIN, WWW_HOST } from "./lib/site"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: WWW_HOST }],
        destination: `${SITE_ORIGIN}/:path*`,
        permanent: true,
      },
    ]
  },
}

export default nextConfig

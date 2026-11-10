/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGitHubPages ? "/travel-agency-management-system" : "",
  assetPrefix: isGitHubPages ? "/travel-agency-management-system/" : undefined,
  poweredByHeader: false
};

export default nextConfig;

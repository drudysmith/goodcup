/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/dailygoodcup60",
        destination: "https://goodcup.me",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

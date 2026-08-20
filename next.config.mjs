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
      {
        source: "/adminDashboard",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/admin/orders",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/admin/login",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

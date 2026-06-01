/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3", "tesseract.js", "tesseract.js-core", "sharp"],
};

export default nextConfig;

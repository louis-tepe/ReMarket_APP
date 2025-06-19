import nextConfig from "eslint-config-next";

export default [
  nextConfig,
  {
    rules: {
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]; 
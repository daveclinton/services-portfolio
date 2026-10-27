import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

// Plugins are named as strings so Turbopack can load them (functions can't cross into Rust).
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [["rehype-pretty-code", { theme: "github-dark-dimmed", keepBackground: false }]],
  },
});

export default withMDX(nextConfig);

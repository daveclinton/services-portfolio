import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import path from "node:path";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm", path.resolve("lib/remark-article-sections.mjs")],
    rehypePlugins: [["rehype-pretty-code", { theme: { light: "github-light", dark: "github-dark-dimmed" }, keepBackground: false }]],
  },
});

export default withMDX(nextConfig);

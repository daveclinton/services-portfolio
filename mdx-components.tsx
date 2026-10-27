import type { MDXComponents } from "mdx/types"

// Post styles live in `.blog-prose` (app/globals.css), so no element overrides are needed yet.
const components: MDXComponents = {}

export function useMDXComponents(): MDXComponents {
  return components
}

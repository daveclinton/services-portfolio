import { createCn } from "cn/config"

/**
 * `cn` merges Tailwind classes, but it cannot know about the custom type scale
 * declared in `app/globals.css`. Without the extension below it reads
 * `text-body` as a text *colour* and quietly drops classes such as
 * `text-primary-foreground`. Registering the scale keeps merging correct while
 * the tokens stay the single source of truth.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["name", "name-sm", "title", "body", "caption", "label"] },
      ],
    },
  },
})

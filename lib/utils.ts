import { createCn } from "cn/config"

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["name", "name-sm", "title", "body", "caption", "label"],
        },
      ],
    },
  },
})

"use client"

import Script from "next/script"

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement | null) => void
      }
    }
  }
}

function renderWidgets() {
  window.twttr?.widgets.load()
}

/**
 * Featured card rendering the live X post embed. The blockquote matches the
 * official publish markup so the post still reads as text before
 * `widgets.js` upgrades it to the interactive embed.
 */
export function FeaturedTweetEmbed() {
  return (
    <>
      <div data-slot="featured-tweet-embed" className="w-full">
        <blockquote
          className="twitter-tweet"
          data-dnt="true"
          data-theme="dark"
        >
          <p lang="en" dir="ltr">
            Turns out, doing it yourself can be quite the adventure.
            <br />
            <br />
            I recently bought a bare metal Mini PC for $100, installed Ubuntu,
            and still I couldn&rsquo;t get the wireless keyboard and mouse to
            work.
            <br />
            <br />
            Now I&rsquo;ve got the Mini PC running alongside my Mac, with
            Ubuntu handling my Linux&hellip;{" "}
            <a href="https://t.co/g9vtYEhUrC">https://t.co/g9vtYEhUrC</a>{" "}
            <a href="https://t.co/4EAK7KDXXH">pic.twitter.com/4EAK7KDXXH</a>
          </p>
          &mdash; David Clinton (@daveclintonn){" "}
          <a href="https://x.com/daveclintonn/status/2099397383477993558?ref_src=twsrc%5Etfw">
            September 14, 2026
          </a>
        </blockquote>
      </div>
      <Script
        src="https://platform.x.com/widgets.js"
        strategy="lazyOnload"
        charSet="utf-8"
        onLoad={renderWidgets}
        onReady={renderWidgets}
      />
    </>
  )
}

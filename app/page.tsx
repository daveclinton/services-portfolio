import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  askAi,
  backgroundItems,
  email,
  introduction,
  profile,
  site,
  socialLinks,
  workLinks,
} from "@/lib/portfolio-data"

export default function Home() {
  return (
    <main className="home-story">
      <header className="home-story-header">
        <div className="home-story-portrait">
          <Avatar className="size-32" aria-label={`${site.name}'s portrait`}>
            <AvatarImage src={profile.avatarSrc} alt={site.name} />
            <AvatarFallback>{profile.initials}</AvatarFallback>
          </Avatar>
        </div>
        <h1>{site.name}</h1>
        <p>
          I am the creator of <a href={introduction.company.href}>{introduction.company.name}</a>,
          creator of its first product <a href={introduction.firstProduct.href}>{introduction.firstProduct.name}</a>
          {" "}(with more to come), and a writer of developer guides for{" "}
          <a href={introduction.paperspaceWriting}>Paperspace</a> and{" "}
          <a href={introduction.studio1hq}>Studio1HQ</a>. I am also a huge fan of{" "}
          <a href={introduction.gameOfThrones}>Game of Thrones</a> and sci-fi shows, an
          avid watcher of technical creators, and excited by how quickly AI is moving.
        </p>
      </header>

      <article className="home-story-article">
        <p id="links">
          You can <Link href={askAi.href}>ask AI about me</Link>, connect with me on{" "}
          <a href={socialLinks[1].href}>LinkedIn</a>, follow me on{" "}
          <a href={socialLinks[2].href}>X</a>, or <a href={email.href}>email me</a>.
        </p>

        <section>
          <h2>Opesi Mansion</h2>
          <p>
            I recently started <a href={introduction.company.href}>{introduction.company.name}</a>.
            Its first product is <a href={introduction.firstProduct.href}>{introduction.firstProduct.name}</a>,
            and more products are on the way.
          </p>
        </section>

        <section>
          <h2>Making everyday work simpler</h2>
          <p>
            At <a href={workLinks.mika}>Mika (Ideal Appliances)</a>, I work on software for the people keeping the
            business moving. {backgroundItems[0].description}
          </p>
        </section>

        <section>
          <h2>Payments and developer education</h2>
          <p>
            I improved online payment experiences for <a href={workLinks.givesuite}>GiveSuite</a> and{" "}
            <a href={workLinks.elementPay}>Element Pay</a>. Through{" "}
            <a href={introduction.studio1hq}>Studio1HQ</a>, I also wrote practical guides for developers.
          </p>
        </section>

        <section>
          <h2>Making investment data easier to understand</h2>
          <p>
            At <a href={workLinks.untapped}>Untapped Global</a>, I worked where software meets
            investment decisions. {backgroundItems[2].description}
          </p>
        </section>

        <section>
          <h2>Writing for developers</h2>
          <p>
            I have also spent time explaining technical ideas in plain language. At{" "}
            <a href={introduction.paperspaceWriting}>Paperspace</a>,{" "}
            {backgroundItems[3].description}
          </p>
        </section>

        {/* Building in the open: add projects here later. */}

        <section>
          <h2>Outside of work</h2>
          <p>
            I am a huge fan of <a href={introduction.gameOfThrones}>Game of Thrones</a> and
            sci-fi shows. I like watching technical content creators, and the speed of
            progress in artificial intelligence keeps me curious about what comes next.
          </p>
        </section>

        <section>
          <h2>The full work history</h2>
          <p>
            If you want the roles and dates behind this story, you can read my{" "}
            <Link href="/experience">work experience</Link>.
          </p>
        </section>
      </article>
    </main>
  )
}

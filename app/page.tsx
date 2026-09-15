import {
  BackgroundSection,
  ContactSection,
  FloatingAiButton,
  OtherWorksSection,
  PortfolioFooter,
  PortfolioHeader,
} from "@/components/portfolio"

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-[680px] flex-col px-4 pt-10 pb-28 sm:px-6 sm:pt-14 sm:pb-32">
          <PortfolioHeader />
          <OtherWorksSection />
          <BackgroundSection />
          <ContactSection />
          <PortfolioFooter />
        </div>
      </main>
      <FloatingAiButton />
    </>
  )
}

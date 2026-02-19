import { ImageResponse } from 'next/og'

export function GET(request: Request) {
  let url = new URL(request.url)
  let title = url.searchParams.get('title') || 'daveclintonn'
  let avatarUrl = `${url.origin}/my-picture.jpg`

  return new ImageResponse(
    (
      <div tw="flex w-full h-full bg-[#0b0b0b] text-[#f2f2f2]">
        <div tw="flex flex-col w-full h-full justify-between p-14">
          <div tw="flex items-center justify-between">
            <div tw="flex text-[18px] tracking-[0.22em] text-[#8fe5ff] uppercase">
              David Clinton
            </div>
            <div tw="flex w-[84px] h-[84px] rounded-full overflow-hidden border border-[#2a2a2a]">
              <img
                src={avatarUrl}
                alt="David Clinton avatar"
                tw="w-full h-full object-cover"
              />
            </div>
          </div>
          <h2 tw="text-[64px] leading-[1.02] font-bold tracking-tight max-w-[1060px]">
            {title}
          </h2>
          <div tw="flex text-[20px] text-[#a6a6a6]">
            Platform, Mobile & Infrastructure Engineering
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

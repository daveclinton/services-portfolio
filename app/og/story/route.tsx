import { ImageResponse } from 'next/og'

export function GET(request: Request) {
  const url = new URL(request.url)
  const title = url.searchParams.get('title') || 'daveclintonn'
  const link = url.searchParams.get('url') || 'https://daveclintonn.cc'
  const avatarUrl = `${url.origin}/my-picture.jpg`

  return new ImageResponse(
    (
      <div tw="flex w-full h-full bg-[#0b0b0b] text-[#f2f2f2] p-[68px]">
        <div tw="flex flex-col w-full h-full border border-[#232323] rounded-[36px] p-[54px] justify-between">
          <div tw="flex items-center justify-between">
            <div tw="flex flex-col">
              <span tw="text-[30px] tracking-[0.15em] text-[#8fe5ff] uppercase">
                David Clinton
              </span>
              <span tw="text-[20px] text-[#a6a6a6]">Platform • Mobile • Infra</span>
            </div>
            <div tw="flex w-[108px] h-[108px] rounded-full overflow-hidden border border-[#2a2a2a]">
              <img
                src={avatarUrl}
                alt="David Clinton avatar"
                tw="w-full h-full object-cover"
              />
            </div>
          </div>

          <div tw="flex flex-col">
            <h1 tw="text-[72px] leading-[1.03] tracking-tight">{title}</h1>
            <div tw="flex mt-[26px] text-[26px] text-[#a6a6a6]">
              Swipe up / link in bio to read full post
            </div>
          </div>

          <div tw="flex flex-col border border-[#232323] rounded-[18px] p-[22px] bg-[rgba(35,35,35,0.32)]">
            <span tw="text-[20px] uppercase tracking-[0.08em] text-[#8fe5ff]">
              Read at
            </span>
            <span tw="text-[26px] mt-[8px] text-[#f2f2f2]">
              {link.replace(/^https?:\/\//, '')}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  )
}


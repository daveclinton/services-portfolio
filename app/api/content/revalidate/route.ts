import { timingSafeEqual } from "node:crypto"
import { revalidateTag, revalidatePath } from "next/cache"

export async function POST(request: Request) {
  const secret=process.env.CONTENT_REVALIDATION_SECRET
  const received=request.headers.get("authorization")??""
  const expected=`Bearer ${secret}`
  if(!secret || secret.length<32 || Buffer.byteLength(received)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(received),Buffer.from(expected))) return new Response(null,{status:401})
  revalidateTag("posts",{expire:0})
  revalidatePath("/blog")
  revalidatePath("/blog/[slug]","page")
  revalidatePath("/feed.xml")
  revalidatePath("/sitemap.xml")
  return Response.json({revalidated:true},{headers:{"Cache-Control":"no-store"}})
}

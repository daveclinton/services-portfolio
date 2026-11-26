# Article images: frames and Cloudinary

Status: built. Cloudinary turns on when its three settings are added; until then
uploads stay in PostgreSQL and every image is still framed.

## Why

Images arrive at any size and shape. Today they are stored in PostgreSQL at their
original size and shown at whatever shape they have. The four images in the
published articles are 1.33 to 1.58 times wider than tall, and one is only 320px
wide. A fixed set of frames keeps every article on the same rhythm, and Cloudinary
serves each image cropped, resized and compressed for the reader's screen.

## The column the frames are designed for

Article bodies sit in the numbered section column (`.signal-body`): `30em` wide
minus the portrait's `1.9em` indent, at the section's type size
(`clamp(1.25rem, 2.56vw, 2.05rem)`). That is about **920px wide at most**,
reached from a 1280px window up, and the full phone width below that.

Sharp images need twice that on high-density screens, so the largest file served
is **1840px** wide.

## Frames

Four frames, named by shape rather than device, as the
[responsive images guidance](https://medium.com/hceverything/applying-srcset-choosing-the-right-sizes-for-responsive-images-at-different-breakpoints-a0433450a4a3)
recommends. Taller frames are shown narrower, so no image is taller than about
0.7 of the column's width and a whole image fits on screen while reading.

| Frame | Ratio | Shown at | For |
| --- | --- | --- | --- |
| Landscape (default) | 3:2 | full column | photos; the existing images are closest to this |
| Wide | 16:9 | full column | screenshots, video stills, diagrams |
| Square | 1:1 | 66% of the column | portraits, logos, small diagrams |
| Portrait | 4:5 | 56% of the column | phone photos and phone screenshots |

- Each image picks one frame. All files served for it share that ratio, as
  [web.dev requires for srcset](https://web.dev/patterns/web-vitals-patterns/images/responsive-images).
- **Nothing is rejected** for size or shape: every image is shown in its frame.
  Images without a frame, including older articles, use Landscape.
- Cropping is automatic: Cloudinary's subject detection (`g_auto`) for
  Cloudinary images, a centred crop (`object-fit: cover`) for others.
- Width and height are always set, so the page reserves space before an image
  loads and nothing jumps.

## How an image is stored

The frame travels at the end of the image address, so Markdown, the Go email
renderer, the public page, the preview tab, the live view and the editor need no
new syntax:

```
![Alt text](https://res.cloudinary.com/<cloud>/image/upload/v1/blog/<id>.jpg#frame=wide)
```

The site recognises Cloudinary addresses and builds the responsive set, cut to
the frame (`c_fill,ar_16:9,g_auto`), at widths 480, 720, 960, 1440 and 1840 with
[`f_auto` and `q_auto`](https://cloudinary.com/documentation/responsive_html)
for format and compression. Email uses one 1200px version.

## Upload flow (owner only)

1. **Add.** Select, paste or drop any image, or give an HTTPS address.
2. **Frame.** The next screen asks for the frame, defaulting to Landscape. The
   bubble menu's Edit image changes it later.
3. **Describe, then review** the image in its frame, as articles will show it.

Behind the upload, the browser asks the API for a signature
(`POST /admin/newsletters/media/sign`, owner session and CSRF). The API secret
never leaves the server, following Cloudinary's
[signed upload](https://cloudinary.com/documentation/authentication_signatures)
guidance. The browser sends the file straight to Cloudinary, so large files skip
the VPS and its 6 MB nginx limit. The signature fixes the `blog/` folder, a
random file name and the image formats (AVIF, GIF, HEIC, JPEG, PNG, WebP). The
desk accepts back only an address for that file in that account.

Without Cloudinary settings, the sign endpoint says so and the desk uploads to
PostgreSQL as before (PNG, JPEG or GIF up to 5 MB).

## Existing images

- The four images in `public/blog` and anything already in PostgreSQL keep
  working, shown in the Landscape frame.
- Moving them to Cloudinary is a manual follow-up once the account exists:
  upload each, then replace its address in the article.

## What it costs

The Free plan gives
[25 credits a month](https://cloudinary.com/documentation/developer_onboarding_faq_credits),
where one credit is 1,000 transformations, 1 GB stored or 1 GB delivered. Each
image produces about six versions, so a blog of this size stays well inside it.
Paid plans start around $89 a month. Limits are soft: Cloudinary emails before
anything is cut off.

## What you need to provide

A Cloudinary account (free), then on the VPS in `backend/.env`:
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. Set all
three or none; the API refuses to start with only some. Nothing is needed in
Vercel: the cloud name reaches the browser with each signature and in image
addresses.

## Sources

- Responsive images and ratios:
  [web.dev](https://web.dev/patterns/web-vitals-patterns/images/responsive-images),
  [srcset sizes](https://medium.com/hceverything/applying-srcset-choosing-the-right-sizes-for-responsive-images-at-different-breakpoints-a0433450a4a3),
  [Cloud Four guidelines](https://cloudfour.com/thinks/8-guidelines-and-1-rule-for-responsive-images/)
- Cloudinary:
  [signatures](https://cloudinary.com/documentation/authentication_signatures),
  [Next.js signed uploads](https://cloudinary.com/blog/nextjs-secure-image-uploads),
  [responsive HTML](https://cloudinary.com/documentation/responsive_html),
  [srcset with Cloudinary](https://cloudinary.com/blog/responsive-image-optimization-srcset-cloudinary),
  [credits](https://cloudinary.com/documentation/developer_onboarding_faq_credits),
  [plans](https://cloudinary.com/pricing/compare-plans)

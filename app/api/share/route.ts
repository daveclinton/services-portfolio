import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Process file here
    const buffer = await file.arrayBuffer()
    const content = new TextDecoder().decode(buffer)

    console.log('Shared file received:', file.name, file.type)

    // Redirect to your editor with file data
    // This is a placeholder - customize for your use case
    return NextResponse.redirect(
      new URL(`/?file=${encodeURIComponent(content)}`, request.url)
    )
  } catch (error) {
    console.error('Share handler error:', error)
    return NextResponse.json(
      { error: 'Failed to process shared file' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  const { tag } = await request.json()
  if (!tag) {
    return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
  }
  try {
    await revalidateTag(tag)
    return NextResponse.json({ revalidated: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 })
  }
}

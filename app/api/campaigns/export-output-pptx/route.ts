import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { generateCampaignOutputPPTX } from '@/lib/pptx/campaign-output-generator'

export async function POST(request: NextRequest) {
  try {
    const { error: authError, db } = await requireAuth()
    if (authError) return authError

    const body = await request.json()
    const { outputId } = body

    if (!outputId) {
      return NextResponse.json({ error: 'outputId is required' }, { status: 400 })
    }

    // Fetch the output record
    const { data: output, error: fetchError } = await db!
      .from('campaign_outputs')
      .select('*, campaigns(name, client_name)')
      .eq('id', outputId)
      .single()

    if (fetchError || !output) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 })
    }

    const campaignName = (output.campaigns as Record<string, unknown>)?.name as string || 'Campaign'
    const clientName = (output.campaigns as Record<string, unknown>)?.client_name as string | undefined

    const buffer = await generateCampaignOutputPPTX(
      output.output_content as Record<string, unknown>,
      campaignName,
      clientName
    )

    const safeName = campaignName.replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeName}_output.pptx"`,
      },
    })
  } catch (error) {
    console.error('export-output-pptx error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

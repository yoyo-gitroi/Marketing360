import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getAdminClient } from '@/lib/db'

const CAMPAIGN_STAGES = [
  { stage_number: 1, stage_key: 'campaign_brief', title: 'Campaign Brief' },
  { stage_number: 2, stage_key: 'brand_reference', title: 'Brand Reference' },
  { stage_number: 3, stage_key: 'market_research', title: 'Market Research' },
  { stage_number: 4, stage_key: 'customer_intel', title: 'Customer Intel' },
  { stage_number: 5, stage_key: 'platform_channel', title: 'Platform & Channel' },
  { stage_number: 6, stage_key: 'historical_data', title: 'Historical Data' },
  { stage_number: 7, stage_key: 'resources', title: 'Resources' },
  { stage_number: 8, stage_key: 'hypothesis', title: 'Hypothesis' },
  { stage_number: 9, stage_key: 'ideation_room', title: 'Ideation Room' },
]

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    // Parse FormData
    const formData = await request.formData()
    const name = formData.get('name') as string
    const clientName = formData.get('clientName') as string
    const clientId = formData.get('clientId') as string | null
    const orgId = formData.get('orgId') as string
    const sourceType = formData.get('sourceType') as string
    const brandBookId = formData.get('brandBookId') as string | null
    const pdfFile = formData.get('brandBookPdf') as File | null

    if (!name?.trim() || !orgId) {
      return NextResponse.json({ error: 'Missing name or orgId' }, { status: 400 })
    }

    // Handle PDF upload if provided - use admin client to ensure bucket exists
    let uploadedPdfUrl: string | null = null
    if (sourceType === 'pdf' && pdfFile) {
      const admin = getAdminClient()
      const bucketName = 'brand-book-pdfs'

      // Ensure bucket exists (create if not)
      const { data: buckets } = await admin.storage.listBuckets()
      const bucketExists = buckets?.some((b) => b.name === bucketName)
      if (!bucketExists) {
        await admin.storage.createBucket(bucketName, { public: false })
      }

      // Upload file
      const fileName = `${orgId}/${Date.now()}-${pdfFile.name}`
      const arrayBuffer = await pdfFile.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const { error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: pdfFile.type || 'application/pdf',
          upsert: true,
        })

      if (uploadError) {
        console.error('PDF upload error:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload PDF: ' + uploadError.message },
          { status: 500 }
        )
      }

      uploadedPdfUrl = fileName
    }

    // Create campaign
    const { data: campaign, error: createError } = await db!
      .from('campaigns')
      .insert({
        name: name.trim(),
        client_name: clientName?.trim() || null,
        client_id: clientId || null,
        org_id: orgId,
        created_by: user!.id,
        status: 'draft',
        brand_book_id: brandBookId || null,
        uploaded_brand_book_url: uploadedPdfUrl,
      })
      .select('id')
      .single()

    if (createError || !campaign) {
      return NextResponse.json(
        { error: 'Failed to create: ' + (createError?.message ?? 'Unknown error') },
        { status: 500 }
      )
    }

    // Create stages
    const stages = CAMPAIGN_STAGES.map((s) => ({
      campaign_id: campaign.id,
      stage_number: s.stage_number,
      stage_key: s.stage_key,
      title: s.title,
      status: 'pending',
      content: null,
    }))

    const { error: stagesError } = await db!
      .from('campaign_stages')
      .insert(stages)

    if (stagesError) {
      return NextResponse.json(
        { error: 'Campaign created but stages failed: ' + stagesError.message, id: campaign.id },
        { status: 207 }
      )
    }

    return NextResponse.json({ id: campaign.id })
  } catch (err) {
    console.error('/api/campaigns/create error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

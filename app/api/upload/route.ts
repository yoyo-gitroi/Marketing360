import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { error: authError, user, db } = await requireAuth()
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const relatedEntityType = formData.get('relatedEntityType') as string | null
    const relatedEntityId = formData.get('relatedEntityId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileId = uuidv4()
    const fileExtension = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${user!.orgId}/${fileId}.${fileExtension}`

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await db!.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Create file_uploads record
    const { data: fileRecord, error: insertError } = await db!
      .from('file_uploads')
      .insert({
        id: fileId,
        org_id: user!.orgId,
        uploaded_by: user!.id,
        file_name: file.name,
        file_type: file.type,
        storage_path: storagePath,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      })
      .select('id, storage_path')
      .single()

    const record = fileRecord as { id: string; storage_path: string } | null

    if (insertError || !record) {
      return NextResponse.json(
        { error: `Failed to create file record: ${insertError?.message ?? 'unknown'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      fileId: record.id,
      storagePath: record.storage_path,
    })
  } catch (error) {
    console.error('upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import PptxGenJS from 'pptxgenjs'

// ─── Design Constants ───

const COLORS = {
  primary: '4C1D95',      // Deep purple
  secondary: '6D28D9',    // Purple
  accent: 'F59E0B',       // Amber
  dark: '1A1A2E',         // Near black
  light: 'F8F9FA',        // Off white
  white: 'FFFFFF',
  gray: '6B7280',
  lightGray: 'E5E7EB',
}

const FONTS = {
  heading: 'Arial',
  body: 'Arial',
}

// ─── Helpers ───

function truncate(text: string | undefined, max: number): string {
  if (!text) return ''
  return text.length > max ? text.substring(0, max - 3) + '...' : text
}

function addSectionDivider(pptx: PptxGenJS, title: string, subtitle?: string) {
  const slide = pptx.addSlide()
  slide.background = { color: COLORS.primary }

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.4, w: 1.5, h: 0.06,
    fill: { color: COLORS.accent },
  })

  slide.addText(title, {
    x: 0.8, y: 2.6, w: 8.4, h: 1.0,
    fontSize: 36, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.8, y: 3.6, w: 8.4, h: 0.6,
      fontSize: 16, fontFace: FONTS.body, color: COLORS.lightGray,
    })
  }
}

function addContentSlide(
  pptx: PptxGenJS,
  title: string,
  content: { label: string; value: string }[],
) {
  const slide = pptx.addSlide()

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  })
  slide.addText(title, {
    x: 0.6, y: 0.15, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  let yPos = 1.2
  for (const item of content) {
    if (yPos > 6.5) break

    slide.addText(item.label, {
      x: 0.6, y: yPos, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: FONTS.heading, color: COLORS.secondary, bold: true,
    })
    yPos += 0.35

    const valueText = truncate(item.value, 500)
    const lineCount = Math.ceil(valueText.length / 100)
    const textHeight = Math.min(Math.max(0.4, lineCount * 0.25), 2.5)

    slide.addText(valueText, {
      x: 0.6, y: yPos, w: 8.8, h: textHeight,
      fontSize: 11, fontFace: FONTS.body, color: COLORS.dark, valign: 'top',
    })
    yPos += textHeight + 0.2
  }
}

function addBulletSlide(pptx: PptxGenJS, title: string, bullets: string[], intro?: string) {
  const slide = pptx.addSlide()

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  })
  slide.addText(title, {
    x: 0.6, y: 0.15, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  let yPos = 1.2
  if (intro) {
    slide.addText(intro, {
      x: 0.6, y: yPos, w: 8.8, h: 0.5,
      fontSize: 12, fontFace: FONTS.body, color: COLORS.gray, italic: true,
    })
    yPos += 0.6
  }

  const bulletText = bullets.map((b) => ({
    text: truncate(b, 200),
    options: { bullet: { code: '25CF' }, fontSize: 12, color: COLORS.dark, breakType: 'n' as const },
  }))

  slide.addText(bulletText as any, {
    x: 0.8, y: yPos, w: 8.4, h: 5.5 - yPos,
    fontFace: FONTS.body, valign: 'top', lineSpacingMultiple: 1.5,
  })
}

// ─── Main Generator ───

export async function generateCampaignOutputPPTX(
  outputContent: Record<string, unknown>,
  campaignName: string,
  clientName?: string
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Marketing360'
  pptx.subject = `${campaignName} - Campaign Output`
  pptx.title = `${campaignName} - Campaign Output`

  // ── 1. Cover Slide ──
  const cover = pptx.addSlide()
  cover.background = { color: COLORS.primary }

  cover.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.0, w: 2.0, h: 0.08,
    fill: { color: COLORS.accent },
  })

  cover.addText(outputContent.campaign_title as string || campaignName, {
    x: 0.8, y: 2.2, w: 8.4, h: 1.2,
    fontSize: 44, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  if (clientName) {
    cover.addText(clientName, {
      x: 0.8, y: 3.4, w: 8.4, h: 0.5,
      fontSize: 18, fontFace: FONTS.body, color: COLORS.lightGray,
    })
  }

  cover.addText('Campaign Output', {
    x: 0.8, y: 4.2, w: 8.4, h: 0.5,
    fontSize: 16, fontFace: FONTS.body, color: COLORS.accent,
  })

  cover.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }), {
    x: 0.8, y: 6.2, w: 8.4, h: 0.4,
    fontSize: 11, fontFace: FONTS.body, color: COLORS.gray,
  })

  // ── 2. Strategic Insight ──
  if (outputContent.strategic_insight) {
    addSectionDivider(pptx, 'Strategic Insight', 'The core insight driving this campaign')
    addContentSlide(pptx, 'Strategic Insight', [
      { label: 'Core Insight', value: outputContent.strategic_insight as string },
    ])
  }

  // ── 3. Target Groups ──
  const targetGroups = outputContent.target_groups as { name: string; description: string; key_traits: string[] }[]
  if (targetGroups?.length) {
    addSectionDivider(pptx, 'Target Groups', 'Who we are speaking to')
    for (const tg of targetGroups) {
      addContentSlide(pptx, tg.name, [
        { label: 'Description', value: tg.description },
        { label: 'Key Traits', value: tg.key_traits?.join(', ') || '' },
      ])
    }
  }

  // ── 4. Tagline Options ──
  const taglines = outputContent.tagline_options as { tagline: string; tone: string; rationale: string }[]
  if (taglines?.length) {
    addSectionDivider(pptx, 'Tagline Options', 'Creative directions for the campaign line')
    const items = taglines.map((t) => ({
      label: `"${t.tagline}" (${t.tone})`,
      value: t.rationale,
    }))
    addContentSlide(pptx, 'Tagline Options', items)
  }

  // ── 5. Campaign Concept ──
  const concept = outputContent.campaign_concept as { title: string; description: string; key_elements: string[] }
  if (concept) {
    addSectionDivider(pptx, 'Campaign Concept', concept.title)
    addContentSlide(pptx, concept.title, [
      { label: 'Concept', value: concept.description },
    ])
    if (concept.key_elements?.length) {
      addBulletSlide(pptx, 'Key Campaign Elements', concept.key_elements)
    }
  }

  // ── 6. Campaign Phases ──
  const phases = outputContent.campaign_phases as {
    phase_number: number; phase_name: string; objective: string; duration: string;
    hero_content: { concept: string; format: string; description: string };
    supporting_content: { type: string; concept: string; description: string }[];
  }[]
  if (phases?.length) {
    addSectionDivider(pptx, 'Execution Plan', 'Phase-wise campaign rollout')
    for (const phase of phases) {
      const items: { label: string; value: string }[] = [
        { label: 'Objective', value: phase.objective },
        { label: 'Duration', value: phase.duration },
      ]
      if (phase.hero_content) {
        items.push({
          label: 'Hero Content',
          value: `${phase.hero_content.concept} (${phase.hero_content.format}): ${phase.hero_content.description}`,
        })
      }
      if (phase.supporting_content?.length) {
        for (const sc of phase.supporting_content) {
          items.push({
            label: `Supporting: ${sc.type}`,
            value: `${sc.concept}: ${sc.description}`,
          })
        }
      }
      addContentSlide(pptx, `Phase ${phase.phase_number}: ${phase.phase_name}`, items)
    }
  }

  // ── 7. Channel Content Ideas ──
  const channels = outputContent.channel_content_ideas as {
    channel: string; content_format: string;
    ideas: { title: string; hook: string; description: string; visual_direction: string }[];
  }[]
  if (channels?.length) {
    addSectionDivider(pptx, 'Channel Content', 'Platform-specific content ideas')
    for (const ch of channels) {
      const bullets = ch.ideas?.map((idea) =>
        `${idea.title}: ${truncate(idea.description, 120)} | Hook: ${truncate(idea.hook, 80)}`
      ) || []
      if (bullets.length) {
        addBulletSlide(pptx, ch.channel, bullets, `Format: ${ch.content_format}`)
      }
    }
  }

  // ── 8. Content Calendar ──
  const calendar = outputContent.content_calendar as {
    cadence: string; monthly_themes: { month: string; theme: string; focus: string }[];
  }
  if (calendar?.monthly_themes?.length) {
    addSectionDivider(pptx, 'Content Calendar', calendar.cadence)
    const items = calendar.monthly_themes.map((mt) => ({
      label: mt.month,
      value: `${mt.theme} — ${mt.focus}`,
    }))
    addContentSlide(pptx, 'Monthly Themes', items)
  }

  // ── 9. Guidelines ──
  const visualGuide = outputContent.visual_guidelines as Record<string, unknown>
  const narrativeGuide = outputContent.narrative_guidelines as Record<string, unknown>
  if (visualGuide || narrativeGuide) {
    addSectionDivider(pptx, 'Guidelines', 'Visual and narrative direction')

    if (visualGuide) {
      const items: { label: string; value: string }[] = []
      if (visualGuide.tone) items.push({ label: 'Visual Tone', value: visualGuide.tone as string })
      if (visualGuide.style_direction) items.push({ label: 'Style Direction', value: visualGuide.style_direction as string })
      if (visualGuide.color_mood) items.push({ label: 'Color Mood', value: visualGuide.color_mood as string })
      if (items.length) addContentSlide(pptx, 'Visual Guidelines', items)

      const dos = (visualGuide.dos as string[]) ?? []
      const donts = (visualGuide.donts as string[]) ?? []
      if (dos.length || donts.length) {
        addBulletSlide(pptx, "Visual Do's & Don'ts", [
          ...dos.map((d) => `✓ ${d}`),
          ...donts.map((d) => `✗ ${d}`),
        ])
      }
    }

    if (narrativeGuide) {
      const items: { label: string; value: string }[] = []
      if (narrativeGuide.voice) items.push({ label: 'Voice', value: narrativeGuide.voice as string })
      if (narrativeGuide.cta_style) items.push({ label: 'CTA Style', value: narrativeGuide.cta_style as string })
      const messages = (narrativeGuide.key_messages as string[]) ?? []
      if (messages.length) items.push({ label: 'Key Messages', value: messages.join('\n') })
      const hashtags = (narrativeGuide.hashtags as string[]) ?? []
      if (hashtags.length) items.push({ label: 'Hashtags', value: hashtags.join('  ') })
      if (items.length) addContentSlide(pptx, 'Narrative Guidelines', items)
    }
  }

  // ── 10. Closing Slide ──
  const closing = pptx.addSlide()
  closing.background = { color: COLORS.primary }

  closing.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.8, w: 1.5, h: 0.06,
    fill: { color: COLORS.accent },
  })

  closing.addText('Thank You', {
    x: 0.8, y: 3.0, w: 8.4, h: 1.0,
    fontSize: 40, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  closing.addText(`${campaignName} — Campaign Output`, {
    x: 0.8, y: 4.0, w: 8.4, h: 0.5,
    fontSize: 16, fontFace: FONTS.body, color: COLORS.lightGray,
  })

  closing.addText('Confidential — For internal use only', {
    x: 0.8, y: 5.5, w: 8.4, h: 0.3,
    fontSize: 10, fontFace: FONTS.body, color: COLORS.gray, italic: true,
  })

  const output = await pptx.write({ outputType: 'nodebuffer' })
  return output as Buffer
}

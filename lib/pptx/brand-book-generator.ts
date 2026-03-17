/* eslint-disable @typescript-eslint/no-explicit-any */
import PptxGenJS from 'pptxgenjs'

// ─── Brand Data Types ───

interface BrandIdentity {
  brand_name: string
  tagline: string
  brand_story_origin: string
  mission_statement: string
  vision_statement: string
  brand_promise: string
}

interface ValuesPillars {
  core_values: string[]
  brand_pillars: { name: string; description: string }[]
  differentiation_statement: string
}

interface VisualIdentity {
  logo_url: string
  color_palette: { hex: string; role: string; usage_percentage: string; emotional_meaning: string }[]
  primary_font: string
  secondary_font: string
  typography_hierarchy_notes: string
  photography_style: string
  iconography_notes: string
}

interface VoiceTone {
  voice_attributes: string[]
  dos: string
  donts: string
  formality_scale: number
  tone_by_channel: { channel: string; tone_description: string }[]
  key_messages: string
  elevator_pitch: string
  boilerplate: string
}

interface TargetAudience {
  primary_tg: { age_range: string; gender: string; location: string; income_level: string; education: string }
  secondary_tg: { age_range: string; gender: string; location: string; income_level: string; education: string }
  psychographics_lifestyle: string
  psychographics_pain_points: string
  psychographics_aspirations: string
  personas: { name: string; age: string; occupation: string; description: string }[]
  search_keywords: string[]
  sentiment_notes: string
  hierarchy_of_use: string
}

interface ProductInfo {
  product_description: string
  key_features: string[]
  certifications: string[]
  core_usp: string
  competitors: { name: string; positioning: string; strengths: string; weaknesses: string }[]
  pricing_notes: string
  packaging_notes: string
}

interface BrandHistory {
  existing_campaigns: { name: string; what_worked: string; what_didnt: string }[]
  social_media: { platform: string; followers: string; engagement_rate: string; notes: string }[]
  platform_strategy_notes: string
  asset_library_links: string
  legal_compliance_notes: string
}

interface ResearchSynthesis {
  founder_interview_notes: string
  india_competition_notes: string
  us_global_competition_notes: string
  own_usp_reframing_thoughts: string
  brand_story_draft_ideas: string
}

interface BrandBookData {
  brand_name: string
  brand_identity?: BrandIdentity
  values_pillars?: ValuesPillars
  visual_identity?: VisualIdentity
  voice_tone?: VoiceTone
  target_audience?: TargetAudience
  product_info?: ProductInfo
  brand_history?: BrandHistory
  research_synthesis?: ResearchSynthesis
}

// ─── Design Constants ───

const COLORS = {
  primary: '1E3A5F',      // Deep navy
  secondary: '2C5F8A',    // Medium blue
  accent: 'E8913A',       // Warm orange
  dark: '1A1A2E',         // Near black
  light: 'F8F9FA',        // Off white
  white: 'FFFFFF',
  gray: '6B7280',
  lightGray: 'E5E7EB',
  success: '059669',
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

  // Decorative accent line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.4, w: 1.5, h: 0.06,
    fill: { color: COLORS.accent },
  })

  slide.addText(title, {
    x: 0.8, y: 2.6, w: 8.4, h: 1.0,
    fontSize: 36, fontFace: FONTS.heading, color: COLORS.white,
    bold: true,
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

  // Title bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  })
  slide.addText(title, {
    x: 0.6, y: 0.15, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  // Content rows
  let yPos = 1.2
  for (const item of content) {
    if (yPos > 6.5) break // Prevent overflow

    slide.addText(item.label, {
      x: 0.6, y: yPos, w: 8.8, h: 0.35,
      fontSize: 12, fontFace: FONTS.heading, color: COLORS.secondary,
      bold: true,
    })
    yPos += 0.35

    const valueText = truncate(item.value, 500)
    const lineCount = Math.ceil(valueText.length / 100)
    const textHeight = Math.min(Math.max(0.4, lineCount * 0.25), 2.5)

    slide.addText(valueText, {
      x: 0.6, y: yPos, w: 8.8, h: textHeight,
      fontSize: 11, fontFace: FONTS.body, color: COLORS.dark,
      valign: 'top',
    })
    yPos += textHeight + 0.2
  }
}

function addBulletSlide(pptx: PptxGenJS, title: string, bullets: string[], intro?: string) {
  const slide = pptx.addSlide()

  // Title bar
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
      fontSize: 12, fontFace: FONTS.body, color: COLORS.gray,
      italic: true,
    })
    yPos += 0.6
  }

  const bulletText = bullets.map((b) => ({
    text: truncate(b, 200),
    options: { bullet: { code: '25CF' }, fontSize: 12, color: COLORS.dark, breakType: 'n' as const },
  }))

  slide.addText(bulletText as any, {
    x: 0.8, y: yPos, w: 8.4, h: 5.5 - yPos,
    fontFace: FONTS.body,
    valign: 'top',
    lineSpacingMultiple: 1.5,
  })
}

function addTableSlide(
  pptx: PptxGenJS,
  title: string,
  headers: string[],
  rows: string[][],
) {
  const slide = pptx.addSlide()

  // Title bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  })
  slide.addText(title, {
    x: 0.6, y: 0.15, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  const colW = headers.map(() => 8.4 / headers.length)
  const headerRow = headers.map((h) => ({
    text: h,
    options: { bold: true, fontSize: 10, color: COLORS.white, fill: { color: COLORS.secondary } },
  }))

  const dataRows = rows.slice(0, 8).map((row, rowIdx) =>
    row.map((cell) => ({
      text: truncate(cell, 80),
      options: {
        fontSize: 9,
        color: COLORS.dark,
        fill: { color: rowIdx % 2 === 0 ? COLORS.light : COLORS.white },
      },
    }))
  )

  slide.addTable([headerRow, ...dataRows] as any, {
    x: 0.8, y: 1.2, w: 8.4,
    colW,
    border: { type: 'solid', pt: 0.5, color: COLORS.lightGray },
    rowH: 0.45,
  })
}

// ─── Main Generator ───

export async function generateBrandBookPPTX(data: BrandBookData): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inches
  pptx.author = 'Marketing360'
  pptx.subject = `${data.brand_name} Brand Book`
  pptx.title = `${data.brand_name} - Brand Book`

  // ── 1. Cover Slide ──
  const cover = pptx.addSlide()
  cover.background = { color: COLORS.primary }

  // Decorative accent bar
  cover.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.0, w: 2.0, h: 0.08,
    fill: { color: COLORS.accent },
  })

  cover.addText(data.brand_name, {
    x: 0.8, y: 2.2, w: 8.4, h: 1.2,
    fontSize: 48, fontFace: FONTS.heading, color: COLORS.white, bold: true,
  })

  const tagline = data.brand_identity?.tagline
  if (tagline) {
    cover.addText(tagline, {
      x: 0.8, y: 3.4, w: 8.4, h: 0.6,
      fontSize: 20, fontFace: FONTS.body, color: COLORS.lightGray, italic: true,
    })
  }

  cover.addText('Brand Book', {
    x: 0.8, y: 4.2, w: 8.4, h: 0.5,
    fontSize: 16, fontFace: FONTS.body, color: COLORS.accent,
  })

  cover.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }), {
    x: 0.8, y: 6.2, w: 8.4, h: 0.4,
    fontSize: 11, fontFace: FONTS.body, color: COLORS.gray,
  })

  // ── 2. Brand Identity Section ──
  if (data.brand_identity) {
    const bi = data.brand_identity
    addSectionDivider(pptx, 'Brand Identity', 'Who we are and what we stand for')

    addContentSlide(pptx, 'Brand Overview', [
      { label: 'Brand Name', value: bi.brand_name },
      { label: 'Tagline', value: bi.tagline },
      { label: 'Brand Promise', value: bi.brand_promise },
    ])

    addContentSlide(pptx, 'Mission & Vision', [
      { label: 'Mission Statement', value: bi.mission_statement },
      { label: 'Vision Statement', value: bi.vision_statement },
    ])

    if (bi.brand_story_origin) {
      addContentSlide(pptx, 'Brand Story & Origin', [
        { label: 'Our Story', value: bi.brand_story_origin },
      ])
    }
  }

  // ── 3. Values & Pillars Section ──
  if (data.values_pillars) {
    const vp = data.values_pillars
    addSectionDivider(pptx, 'Values & Pillars', 'The foundation of our brand')

    if (vp.core_values?.length) {
      addBulletSlide(pptx, 'Core Values', vp.core_values)
    }

    if (vp.brand_pillars?.length) {
      addTableSlide(
        pptx,
        'Brand Pillars',
        ['Pillar', 'Description'],
        vp.brand_pillars.map((p) => [p.name, p.description])
      )
    }

    if (vp.differentiation_statement) {
      addContentSlide(pptx, 'Differentiation', [
        { label: 'What Makes Us Unique', value: vp.differentiation_statement },
      ])
    }
  }

  // ── 4. Visual Identity Section ──
  if (data.visual_identity) {
    const vi = data.visual_identity
    addSectionDivider(pptx, 'Visual Identity', 'How our brand looks and feels')

    // Color palette slide
    if (vi.color_palette?.length) {
      const colorSlide = pptx.addSlide()
      colorSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.9,
        fill: { color: COLORS.primary },
      })
      colorSlide.addText('Color Palette', {
        x: 0.6, y: 0.15, w: 8.8, h: 0.6,
        fontSize: 22, fontFace: FONTS.heading, color: COLORS.white, bold: true,
      })

      const swatchWidth = Math.min(2.0, 8.0 / vi.color_palette.length)
      vi.color_palette.slice(0, 5).forEach((color, idx) => {
        const x = 0.8 + idx * (swatchWidth + 0.2)

        // Color swatch
        const hex = color.hex?.replace('#', '') || 'CCCCCC'
        colorSlide.addShape(pptx.ShapeType.rect, {
          x, y: 1.4, w: swatchWidth, h: 1.5,
          fill: { color: hex },
          rectRadius: 0.1,
          shadow: { type: 'outer', blur: 4, offset: 2, color: '000000', opacity: 0.2 },
        })

        // Color info
        colorSlide.addText(`#${hex}`, {
          x, y: 3.0, w: swatchWidth, h: 0.3,
          fontSize: 10, fontFace: FONTS.body, color: COLORS.dark, bold: true,
        })
        colorSlide.addText(color.role || '', {
          x, y: 3.3, w: swatchWidth, h: 0.25,
          fontSize: 9, fontFace: FONTS.body, color: COLORS.secondary,
        })
        colorSlide.addText(color.emotional_meaning || '', {
          x, y: 3.55, w: swatchWidth, h: 0.4,
          fontSize: 8, fontFace: FONTS.body, color: COLORS.gray,
        })
      })
    }

    // Typography slide
    addContentSlide(pptx, 'Typography', [
      { label: 'Primary Font', value: vi.primary_font || 'Not specified' },
      { label: 'Secondary Font', value: vi.secondary_font || 'Not specified' },
      { label: 'Typography Notes', value: vi.typography_hierarchy_notes || '' },
    ])

    // Photography & Iconography
    addContentSlide(pptx, 'Photography & Iconography', [
      { label: 'Photography Style', value: vi.photography_style || '' },
      { label: 'Iconography Notes', value: vi.iconography_notes || '' },
    ])
  }

  // ── 5. Voice & Tone Section ──
  if (data.voice_tone) {
    const vt = data.voice_tone
    addSectionDivider(pptx, 'Voice & Tone', 'How our brand communicates')

    if (vt.voice_attributes?.length) {
      addBulletSlide(pptx, 'Voice Attributes', vt.voice_attributes,
        `Formality Scale: ${vt.formality_scale || 'N/A'}/10`)
    }

    addContentSlide(pptx, 'Voice Guidelines', [
      { label: "Do's", value: vt.dos || '' },
      { label: "Don'ts", value: vt.donts || '' },
    ])

    if (vt.tone_by_channel?.length) {
      addTableSlide(
        pptx,
        'Tone by Channel',
        ['Channel', 'Tone Description'],
        vt.tone_by_channel.map((t) => [t.channel, t.tone_description])
      )
    }

    addContentSlide(pptx, 'Key Messaging', [
      { label: 'Elevator Pitch', value: vt.elevator_pitch || '' },
      { label: 'Key Messages', value: vt.key_messages || '' },
      { label: 'Boilerplate', value: vt.boilerplate || '' },
    ])
  }

  // ── 6. Target Audience Section ──
  if (data.target_audience) {
    const ta = data.target_audience
    addSectionDivider(pptx, 'Target Audience', 'Who we are speaking to')

    // Primary & Secondary TG
    if (ta.primary_tg) {
      const tgRows: string[][] = []
      const fields = ['age_range', 'gender', 'location', 'income_level', 'education'] as const
      fields.forEach((f) => {
        const label = f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        tgRows.push([label, ta.primary_tg?.[f] || '', ta.secondary_tg?.[f] || ''])
      })
      addTableSlide(pptx, 'Target Demographics', ['Attribute', 'Primary TG', 'Secondary TG'], tgRows)
    }

    // Psychographics
    addContentSlide(pptx, 'Psychographics', [
      { label: 'Lifestyle', value: ta.psychographics_lifestyle || '' },
      { label: 'Pain Points', value: ta.psychographics_pain_points || '' },
      { label: 'Aspirations', value: ta.psychographics_aspirations || '' },
    ])

    // Personas
    if (ta.personas?.length) {
      addTableSlide(
        pptx,
        'Customer Personas',
        ['Name', 'Age', 'Occupation', 'Description'],
        ta.personas.map((p) => [p.name, p.age, p.occupation, p.description])
      )
    }

    // Keywords & Strategy
    const strategyItems: { label: string; value: string }[] = []
    if (ta.search_keywords?.length) {
      strategyItems.push({ label: 'Search Keywords', value: ta.search_keywords.join(', ') })
    }
    if (ta.sentiment_notes) {
      strategyItems.push({ label: 'Sentiment Notes', value: ta.sentiment_notes })
    }
    if (ta.hierarchy_of_use) {
      strategyItems.push({ label: 'Hierarchy of Use', value: ta.hierarchy_of_use })
    }
    if (strategyItems.length) {
      addContentSlide(pptx, 'Audience Strategy', strategyItems)
    }
  }

  // ── 7. Product Info Section ──
  if (data.product_info) {
    const pi = data.product_info
    addSectionDivider(pptx, 'Product Information', 'What we offer')

    addContentSlide(pptx, 'Product Overview', [
      { label: 'Description', value: pi.product_description || '' },
      { label: 'Core USP', value: pi.core_usp || '' },
    ])

    if (pi.key_features?.length) {
      addBulletSlide(pptx, 'Key Features', pi.key_features)
    }

    if (pi.competitors?.length) {
      addTableSlide(
        pptx,
        'Competitive Landscape',
        ['Competitor', 'Positioning', 'Strengths', 'Weaknesses'],
        pi.competitors.map((c) => [c.name, c.positioning, c.strengths, c.weaknesses])
      )
    }

    const extraItems: { label: string; value: string }[] = []
    if (pi.certifications?.length) {
      extraItems.push({ label: 'Certifications', value: pi.certifications.join(', ') })
    }
    if (pi.pricing_notes) {
      extraItems.push({ label: 'Pricing Notes', value: pi.pricing_notes })
    }
    if (pi.packaging_notes) {
      extraItems.push({ label: 'Packaging Notes', value: pi.packaging_notes })
    }
    if (extraItems.length) {
      addContentSlide(pptx, 'Product Details', extraItems)
    }
  }

  // ── 8. Brand History Section ──
  if (data.brand_history) {
    const bh = data.brand_history
    addSectionDivider(pptx, 'Brand History', 'Our marketing journey')

    if (bh.existing_campaigns?.length) {
      addTableSlide(
        pptx,
        'Campaign History',
        ['Campaign', 'What Worked', "What Didn't"],
        bh.existing_campaigns.map((c) => [c.name, c.what_worked, c.what_didnt])
      )
    }

    if (bh.social_media?.length) {
      addTableSlide(
        pptx,
        'Social Media Presence',
        ['Platform', 'Followers', 'Engagement', 'Notes'],
        bh.social_media.map((s) => [s.platform, s.followers, s.engagement_rate, s.notes])
      )
    }

    const historyItems: { label: string; value: string }[] = []
    if (bh.platform_strategy_notes) {
      historyItems.push({ label: 'Platform Strategy', value: bh.platform_strategy_notes })
    }
    if (bh.legal_compliance_notes) {
      historyItems.push({ label: 'Legal & Compliance', value: bh.legal_compliance_notes })
    }
    if (historyItems.length) {
      addContentSlide(pptx, 'Strategy & Compliance', historyItems)
    }
  }

  // ── 9. Research Synthesis Section ──
  if (data.research_synthesis) {
    const rs = data.research_synthesis
    addSectionDivider(pptx, 'Research Synthesis', 'Insights and strategic thinking')

    const researchItems: { label: string; value: string }[] = []
    if (rs.founder_interview_notes) {
      researchItems.push({ label: 'Founder Insights', value: rs.founder_interview_notes })
    }
    if (rs.india_competition_notes) {
      researchItems.push({ label: 'India Competition', value: rs.india_competition_notes })
    }
    if (rs.us_global_competition_notes) {
      researchItems.push({ label: 'US/Global Competition', value: rs.us_global_competition_notes })
    }

    if (researchItems.length) {
      addContentSlide(pptx, 'Research Insights', researchItems)
    }

    const strategyItems: { label: string; value: string }[] = []
    if (rs.own_usp_reframing_thoughts) {
      strategyItems.push({ label: 'USP Reframing', value: rs.own_usp_reframing_thoughts })
    }
    if (rs.brand_story_draft_ideas) {
      strategyItems.push({ label: 'Brand Story Ideas', value: rs.brand_story_draft_ideas })
    }
    if (strategyItems.length) {
      addContentSlide(pptx, 'Strategic Thinking', strategyItems)
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

  closing.addText(`${data.brand_name} Brand Book`, {
    x: 0.8, y: 4.0, w: 8.4, h: 0.5,
    fontSize: 16, fontFace: FONTS.body, color: COLORS.lightGray,
  })

  closing.addText('Confidential — For internal use only', {
    x: 0.8, y: 5.5, w: 8.4, h: 0.3,
    fontSize: 10, fontFace: FONTS.body, color: COLORS.gray, italic: true,
  })

  // Generate PPTX as buffer
  const output = await pptx.write({ outputType: 'nodebuffer' })
  return output as Buffer
}

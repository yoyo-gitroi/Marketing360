'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface BrandBook {
  id: string;
  name: string;
  client_name: string | null;
}

interface Section {
  section_key: string;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
}

function getContent(section: Section | undefined): Record<string, unknown> {
  if (!section) return {};
  if (section.final_content && Object.keys(section.final_content).length > 0) return section.final_content;
  if (section.user_input && Object.keys(section.user_input).length > 0) return section.user_input;
  if (section.ai_generated && Object.keys(section.ai_generated).length > 0) return section.ai_generated;
  return {};
}

function get(data: Record<string, unknown>, key: string): string {
  const val = data[key];
  if (!val) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function getArr(data: Record<string, unknown>, key: string): unknown[] {
  const val = data[key];
  if (Array.isArray(val)) return val;
  return [];
}

export default function BrandBookPDFPage() {
  const params = useParams();
  const brandBookId = params.id as string;
  const supabase = createClient();

  const [brandBook, setBrandBook] = useState<BrandBook | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [bookRes, sectionsRes] = await Promise.all([
      supabase.from('brand_books').select('id, name, client_name').eq('id', brandBookId).single(),
      supabase.from('brand_book_sections').select('section_key, user_input, ai_generated, final_content').eq('brand_book_id', brandBookId),
    ]);

    if (bookRes.data) setBrandBook(bookRes.data as BrandBook);
    if (sectionsRes.data) setSections(sectionsRes.data as Section[]);
    setLoading(false);
  }, [brandBookId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!loading && brandBook) {
      // Auto-trigger print after content renders
      setTimeout(() => window.print(), 500);
    }
  }, [loading, brandBook]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const find = (key: string) => sections.find((s) => s.section_key === key);
  const bi = getContent(find('brand_identity'));
  const vp = getContent(find('values_pillars'));
  const vi = getContent(find('visual_identity'));
  const vt = getContent(find('voice_tone'));
  const ta = getContent(find('target_audience'));
  const pi = getContent(find('product_info'));
  const bh = getContent(find('brand_history'));
  const rs = getContent(find('research_synthesis'));

  const colorPalette = getArr(vi, 'color_palette') as { hex?: string; role?: string; emotional_meaning?: string }[];
  const brandPillars = getArr(vp, 'brand_pillars') as { name?: string; description?: string }[];
  const personas = getArr(ta, 'personas') as { name?: string; age?: string; occupation?: string; description?: string }[];
  const competitors = getArr(pi, 'competitors') as { name?: string; positioning?: string; strengths?: string; weaknesses?: string }[];
  const campaigns = getArr(bh, 'existing_campaigns') as { name?: string; what_worked?: string; what_didnt?: string }[];
  const socialMedia = getArr(bh, 'social_media') as { platform?: string; followers?: string; engagement_rate?: string; notes?: string }[];
  const toneByChannel = getArr(vt, 'tone_by_channel') as { channel?: string; tone_description?: string }[];

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, header, footer, .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
        @page { size: A4; margin: 1.5cm; }
        .brand-pdf { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; }
        .brand-pdf h1 { font-size: 2.5rem; font-weight: 700; color: #1e3a5f; }
        .brand-pdf h2 { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; border-bottom: 3px solid #e8913a; padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 2rem; }
        .brand-pdf h3 { font-size: 1.1rem; font-weight: 600; color: #2c5f8a; margin-top: 1rem; }
        .brand-pdf .section-card { background: #f8f9fa; border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1rem; }
        .brand-pdf table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
        .brand-pdf th { background: #1e3a5f; color: white; padding: 0.5rem; text-align: left; font-size: 0.85rem; }
        .brand-pdf td { padding: 0.5rem; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
        .brand-pdf tr:nth-child(even) td { background: #f8f9fa; }
        .color-swatch { display: inline-block; width: 60px; height: 60px; border-radius: 8px; border: 1px solid #e5e7eb; }
      `}</style>

      <div className="brand-pdf max-w-4xl mx-auto p-8">
        {/* Print Button */}
        <div className="no-print mb-6 flex items-center gap-4">
          <a
            href={`/brand-books/${brandBookId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to Editor
          </a>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Save as PDF (Ctrl+P)
          </button>
        </div>

        {/* Cover Page */}
        <div className="print-page flex flex-col justify-center min-h-[80vh]">
          <div className="w-20 h-1 bg-[#e8913a] mb-4"></div>
          <h1 className="text-5xl font-bold text-[#1e3a5f] mb-2">{brandBook?.name}</h1>
          {get(bi, 'tagline') && (
            <p className="text-xl text-gray-500 italic mb-4">{get(bi, 'tagline')}</p>
          )}
          <p className="text-lg text-[#e8913a] mb-8">Brand Book</p>
          {brandBook?.client_name && (
            <p className="text-gray-500">{brandBook.client_name}</p>
          )}
          <p className="text-gray-400 text-sm mt-auto">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Brand Identity */}
        {Object.keys(bi).length > 0 && (
          <div className="print-page">
            <h2>Brand Identity</h2>
            {get(bi, 'brand_name') && <div className="section-card"><h3>Brand Name</h3><p>{get(bi, 'brand_name')}</p></div>}
            {get(bi, 'brand_promise') && <div className="section-card"><h3>Brand Promise</h3><p>{get(bi, 'brand_promise')}</p></div>}
            {get(bi, 'mission_statement') && <div className="section-card"><h3>Mission Statement</h3><p>{get(bi, 'mission_statement')}</p></div>}
            {get(bi, 'vision_statement') && <div className="section-card"><h3>Vision Statement</h3><p>{get(bi, 'vision_statement')}</p></div>}
            {get(bi, 'brand_story_origin') && <div className="section-card"><h3>Brand Story</h3><p className="whitespace-pre-wrap">{get(bi, 'brand_story_origin')}</p></div>}
          </div>
        )}

        {/* Values & Pillars */}
        {Object.keys(vp).length > 0 && (
          <div className="print-page">
            <h2>Values & Pillars</h2>
            {getArr(vp, 'core_values').length > 0 && (
              <div className="section-card">
                <h3>Core Values</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {(getArr(vp, 'core_values') as string[]).map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </div>
            )}
            {brandPillars.length > 0 && (
              <>
                <h3>Brand Pillars</h3>
                <table>
                  <thead><tr><th>Pillar</th><th>Description</th></tr></thead>
                  <tbody>{brandPillars.map((p, i) => <tr key={i}><td className="font-medium">{p.name}</td><td>{p.description}</td></tr>)}</tbody>
                </table>
              </>
            )}
            {get(vp, 'differentiation_statement') && <div className="section-card"><h3>Differentiation</h3><p>{get(vp, 'differentiation_statement')}</p></div>}
          </div>
        )}

        {/* Visual Identity */}
        {Object.keys(vi).length > 0 && (
          <div className="print-page">
            <h2>Visual Identity</h2>
            {colorPalette.length > 0 && (
              <div className="section-card">
                <h3>Color Palette</h3>
                <div className="flex gap-4 flex-wrap mt-2">
                  {colorPalette.map((c, i) => (
                    <div key={i} className="text-center">
                      <div className="color-swatch" style={{ backgroundColor: c.hex || '#ccc' }}></div>
                      <p className="text-xs font-mono mt-1">{c.hex}</p>
                      <p className="text-xs text-gray-500">{c.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {get(vi, 'primary_font') && <div className="section-card"><h3>Primary Font</h3><p>{get(vi, 'primary_font')}</p></div>}
              {get(vi, 'secondary_font') && <div className="section-card"><h3>Secondary Font</h3><p>{get(vi, 'secondary_font')}</p></div>}
            </div>
            {get(vi, 'typography_hierarchy_notes') && <div className="section-card"><h3>Typography Notes</h3><p>{get(vi, 'typography_hierarchy_notes')}</p></div>}
            {get(vi, 'photography_style') && <div className="section-card"><h3>Photography Style</h3><p>{get(vi, 'photography_style')}</p></div>}
            {get(vi, 'iconography_notes') && <div className="section-card"><h3>Iconography</h3><p>{get(vi, 'iconography_notes')}</p></div>}
          </div>
        )}

        {/* Voice & Tone */}
        {Object.keys(vt).length > 0 && (
          <div className="print-page">
            <h2>Voice & Tone</h2>
            {getArr(vt, 'voice_attributes').length > 0 && (
              <div className="section-card">
                <h3>Voice Attributes</h3>
                <div className="flex gap-2 flex-wrap">{(getArr(vt, 'voice_attributes') as string[]).map((a, i) => <span key={i} className="px-3 py-1 bg-[#1e3a5f] text-white rounded-full text-sm">{a}</span>)}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {get(vt, 'dos') && <div className="section-card"><h3>Do&apos;s</h3><p className="whitespace-pre-wrap">{get(vt, 'dos')}</p></div>}
              {get(vt, 'donts') && <div className="section-card"><h3>Don&apos;ts</h3><p className="whitespace-pre-wrap">{get(vt, 'donts')}</p></div>}
            </div>
            {toneByChannel.length > 0 && (
              <>
                <h3>Tone by Channel</h3>
                <table>
                  <thead><tr><th>Channel</th><th>Tone</th></tr></thead>
                  <tbody>{toneByChannel.map((t, i) => <tr key={i}><td className="font-medium">{t.channel}</td><td>{t.tone_description}</td></tr>)}</tbody>
                </table>
              </>
            )}
            {get(vt, 'elevator_pitch') && <div className="section-card"><h3>Elevator Pitch</h3><p>{get(vt, 'elevator_pitch')}</p></div>}
            {get(vt, 'key_messages') && <div className="section-card"><h3>Key Messages</h3><p className="whitespace-pre-wrap">{get(vt, 'key_messages')}</p></div>}
            {get(vt, 'boilerplate') && <div className="section-card"><h3>Boilerplate</h3><p>{get(vt, 'boilerplate')}</p></div>}
          </div>
        )}

        {/* Target Audience */}
        {Object.keys(ta).length > 0 && (
          <div className="print-page">
            <h2>Target Audience</h2>
            {!!(ta.primary_tg || ta.secondary_tg) && (
              <table>
                <thead><tr><th>Attribute</th><th>Primary TG</th><th>Secondary TG</th></tr></thead>
                <tbody>
                  {['age_range', 'gender', 'location', 'income_level', 'education'].map((f) => {
                    const ptg = (ta.primary_tg as Record<string, string>) || {};
                    const stg = (ta.secondary_tg as Record<string, string>) || {};
                    return <tr key={f}><td className="font-medium capitalize">{f.replace(/_/g, ' ')}</td><td>{ptg[f] || '-'}</td><td>{stg[f] || '-'}</td></tr>;
                  })}
                </tbody>
              </table>
            )}
            {get(ta, 'psychographics_lifestyle') && <div className="section-card"><h3>Lifestyle</h3><p>{get(ta, 'psychographics_lifestyle')}</p></div>}
            {get(ta, 'psychographics_pain_points') && <div className="section-card"><h3>Pain Points</h3><p>{get(ta, 'psychographics_pain_points')}</p></div>}
            {get(ta, 'psychographics_aspirations') && <div className="section-card"><h3>Aspirations</h3><p>{get(ta, 'psychographics_aspirations')}</p></div>}
            {personas.length > 0 && (
              <>
                <h3>Customer Personas</h3>
                <table>
                  <thead><tr><th>Name</th><th>Age</th><th>Occupation</th><th>Description</th></tr></thead>
                  <tbody>{personas.map((p, i) => <tr key={i}><td className="font-medium">{p.name}</td><td>{p.age}</td><td>{p.occupation}</td><td>{p.description}</td></tr>)}</tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* Product Info */}
        {Object.keys(pi).length > 0 && (
          <div className="print-page">
            <h2>Product Information</h2>
            {get(pi, 'product_description') && <div className="section-card"><h3>Description</h3><p>{get(pi, 'product_description')}</p></div>}
            {get(pi, 'core_usp') && <div className="section-card"><h3>Core USP</h3><p>{get(pi, 'core_usp')}</p></div>}
            {getArr(pi, 'key_features').length > 0 && (
              <div className="section-card">
                <h3>Key Features</h3>
                <ul className="list-disc pl-5 space-y-1">{(getArr(pi, 'key_features') as string[]).map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}
            {competitors.length > 0 && (
              <>
                <h3>Competitive Landscape</h3>
                <table>
                  <thead><tr><th>Competitor</th><th>Positioning</th><th>Strengths</th><th>Weaknesses</th></tr></thead>
                  <tbody>{competitors.map((c, i) => <tr key={i}><td className="font-medium">{c.name}</td><td>{c.positioning}</td><td>{c.strengths}</td><td>{c.weaknesses}</td></tr>)}</tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* Brand History */}
        {Object.keys(bh).length > 0 && (
          <div className="print-page">
            <h2>Brand History</h2>
            {campaigns.length > 0 && (
              <>
                <h3>Past Campaigns</h3>
                <table>
                  <thead><tr><th>Campaign</th><th>What Worked</th><th>What Didn&apos;t</th></tr></thead>
                  <tbody>{campaigns.map((c, i) => <tr key={i}><td className="font-medium">{c.name}</td><td>{c.what_worked}</td><td>{c.what_didnt}</td></tr>)}</tbody>
                </table>
              </>
            )}
            {socialMedia.length > 0 && (
              <>
                <h3>Social Media Presence</h3>
                <table>
                  <thead><tr><th>Platform</th><th>Followers</th><th>Engagement</th><th>Notes</th></tr></thead>
                  <tbody>{socialMedia.map((s, i) => <tr key={i}><td className="font-medium">{s.platform}</td><td>{s.followers}</td><td>{s.engagement_rate}</td><td>{s.notes}</td></tr>)}</tbody>
                </table>
              </>
            )}
            {get(bh, 'platform_strategy_notes') && <div className="section-card"><h3>Platform Strategy</h3><p>{get(bh, 'platform_strategy_notes')}</p></div>}
            {get(bh, 'legal_compliance_notes') && <div className="section-card"><h3>Legal & Compliance</h3><p>{get(bh, 'legal_compliance_notes')}</p></div>}
          </div>
        )}

        {/* Research Synthesis */}
        {Object.keys(rs).length > 0 && (
          <div className="print-page">
            <h2>Research Synthesis</h2>
            {get(rs, 'founder_interview_notes') && <div className="section-card"><h3>Founder Insights</h3><p className="whitespace-pre-wrap">{get(rs, 'founder_interview_notes')}</p></div>}
            {get(rs, 'india_competition_notes') && <div className="section-card"><h3>India Competition</h3><p className="whitespace-pre-wrap">{get(rs, 'india_competition_notes')}</p></div>}
            {get(rs, 'us_global_competition_notes') && <div className="section-card"><h3>US/Global Competition</h3><p className="whitespace-pre-wrap">{get(rs, 'us_global_competition_notes')}</p></div>}
            {get(rs, 'own_usp_reframing_thoughts') && <div className="section-card"><h3>USP Reframing</h3><p className="whitespace-pre-wrap">{get(rs, 'own_usp_reframing_thoughts')}</p></div>}
            {get(rs, 'brand_story_draft_ideas') && <div className="section-card"><h3>Brand Story Ideas</h3><p className="whitespace-pre-wrap">{get(rs, 'brand_story_draft_ideas')}</p></div>}
          </div>
        )}

        {/* Closing */}
        <div className="print-page flex flex-col justify-center items-center min-h-[40vh] text-center">
          <div className="w-20 h-1 bg-[#e8913a] mb-6"></div>
          <h2 className="text-3xl font-bold text-[#1e3a5f] border-none mb-2">Thank You</h2>
          <p className="text-gray-500">{brandBook?.name} Brand Book</p>
          <p className="text-gray-400 text-sm mt-4 italic">Confidential - For internal use only</p>
        </div>
      </div>
    </>
  );
}

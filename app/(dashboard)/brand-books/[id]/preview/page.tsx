import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Section {
  id: string;
  section_key: string;
  title: string;
  content: string;
  status: string;
  order_index: number;
}

export default async function BrandBookPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch brand book
  const { data: brandBook } = await supabase
    .from("brand_books")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!brandBook) {
    return (
      <div className="mx-auto max-w-4xl py-10 px-4">
        <p className="text-red-600">Brand book not found.</p>
      </div>
    );
  }

  // Fetch approved sections, ordered
  const { data: sections } = await supabase
    .from("brand_book_sections")
    .select("*")
    .eq("brand_book_id", params.id)
    .eq("status", "approved")
    .order("order_index", { ascending: true });

  const approvedSections: Section[] = (sections as Section[]) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-3">
          <div>
            <a
              href={`/brand-books/${params.id}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              &larr; Back to Editor
            </a>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {brandBook.name} &mdash; Preview
            </h1>
          </div>
          <a
            href={`/brand-books/${params.id}/pdf`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Generate PDF
          </a>
        </div>
      </div>

      {/* Document Preview */}
      <div className="mx-auto max-w-4xl py-10 px-4">
        <div className="rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden">
          {/* Cover Page */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-12 py-20 text-white text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              {brandBook.name}
            </h1>
            {brandBook.tagline && (
              <p className="mt-4 text-xl text-blue-100 font-light">
                {brandBook.tagline}
              </p>
            )}
            <div className="mt-8 text-sm text-blue-200">
              Brand Book &middot;{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </div>
          </div>

          {/* Table of Contents */}
          {approvedSections.length > 0 && (
            <div className="px-12 py-10 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Table of Contents
              </h2>
              <ol className="space-y-2">
                {approvedSections.map((section, idx) => (
                  <li
                    key={section.id}
                    className="flex items-baseline gap-3 text-sm"
                  >
                    <span className="font-medium text-gray-400 w-6 text-right">
                      {idx + 1}.
                    </span>
                    <a
                      href={`#section-${section.section_key}`}
                      className="text-gray-700 hover:text-blue-600 transition"
                    >
                      {section.title}
                    </a>
                    <span className="flex-1 border-b border-dotted border-gray-300" />
                    <span className="text-gray-400 text-xs">
                      {section.section_key}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Sections */}
          {approvedSections.length === 0 ? (
            <div className="px-12 py-16 text-center text-gray-400">
              <p className="text-lg font-medium">No approved sections yet</p>
              <p className="mt-2 text-sm">
                Approve sections in the editor to see them here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {approvedSections.map((section) => (
                <div
                  key={section.id}
                  id={`section-${section.section_key}`}
                  className="px-12 py-10"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {section.title}
                  </h2>
                  <div className="mb-6 text-xs text-gray-400 uppercase tracking-wider">
                    {section.section_key}
                  </div>
                  <div
                    className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 px-12 py-6 text-center text-xs text-gray-400">
            Generated by Marketing 360 &middot; Confidential
          </div>
        </div>
      </div>
    </div>
  );
}

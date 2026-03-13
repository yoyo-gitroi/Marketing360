"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PDFStatus = "idle" | "generating" | "ready" | "error";

export default function BrandBookPDFPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [status, setStatus] = useState<PDFStatus>("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [brandBookName, setBrandBookName] = useState<string>("");

  useEffect(() => {
    fetchBrandBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBrandBook() {
    const { data: brandBook } = await supabase
      .from("brand_books")
      .select("name, pdf_url")
      .eq("id", params.id)
      .single();

    if (brandBook) {
      setBrandBookName(brandBook.name);
      if (brandBook.pdf_url) {
        setPdfUrl(brandBook.pdf_url);
        setStatus("ready");
      }
    }
  }

  async function handleGeneratePDF() {
    setStatus("generating");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/brand-books/${params.id}/pdf`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to generate PDF");
      }

      const { url } = await res.json();
      setPdfUrl(url);
      setStatus("ready");
    } catch (err: any) {
      setErrorMessage(err.message ?? "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-10 px-4">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <a
            href={`/brand-books/${params.id}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            &larr; Back to Brand Book
          </a>
          <h1 className="text-2xl font-bold mt-1">
            {brandBookName || "Brand Book"} &mdash; PDF
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and download a PDF version of this brand book.
          </p>
        </div>

        <button
          onClick={handleGeneratePDF}
          disabled={status === "generating"}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "generating"
            ? "Generating..."
            : status === "ready"
              ? "Regenerate PDF"
              : "Generate PDF"}
        </button>
      </div>

      {/* Status indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === "idle"
                ? "bg-gray-300"
                : status === "generating"
                  ? "bg-yellow-400 animate-pulse"
                  : status === "ready"
                    ? "bg-green-500"
                    : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600 capitalize">
            {status === "idle" && "No PDF generated yet"}
            {status === "generating" && "Generating PDF..."}
            {status === "ready" && "PDF ready"}
            {status === "error" && "Generation failed"}
          </span>
        </div>
        {errorMessage && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>

      {/* PDF Viewer */}
      {status === "ready" && pdfUrl && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              PDF Preview
            </span>
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Download PDF
            </a>
          </div>
          <iframe
            src={pdfUrl}
            className="w-full border-0"
            style={{ height: "80vh" }}
            title="Brand Book PDF"
          />
        </div>
      )}

      {status === "idle" && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
          <div className="text-gray-400 mb-3">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">
            Click <strong>Generate PDF</strong> to create a downloadable PDF of
            your brand book with all approved sections.
          </p>
        </div>
      )}

      {status === "generating" && (
        <div className="rounded-lg border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">
            Generating your brand book PDF. This may take a moment...
          </p>
        </div>
      )}
    </div>
  );
}

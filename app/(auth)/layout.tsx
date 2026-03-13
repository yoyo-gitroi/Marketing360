export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Marketing 360
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1">
          Brand &amp; Campaign Platform
        </p>
      </div>
      {children}
    </div>
  );
}

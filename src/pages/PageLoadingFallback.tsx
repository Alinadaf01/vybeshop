export function PageLoadingFallback() {
  return (
    <div role="status" aria-label="در حال بارگذاری صفحه" className="flex min-h-screen items-center justify-center">
      <span className="inline-block size-6 animate-spin rounded-full border-2 border-gray-100 border-t-graphite" />
    </div>
  );
}

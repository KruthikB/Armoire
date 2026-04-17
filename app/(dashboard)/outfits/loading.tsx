export default function OutfitsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-36 rounded" />
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>

      {/* Outfit cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton rounded-2xl h-64" />
        ))}
      </div>
    </div>
  );
}

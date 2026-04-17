export default function FavoritesLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Toolbar row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="skeleton h-9 w-56 rounded-xl" />
        <div className="skeleton h-9 w-28 rounded-xl" />
        <div className="ml-auto skeleton h-9 w-24 rounded-xl" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton aspect-square rounded-2xl" />
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

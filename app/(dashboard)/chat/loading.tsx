export default function ChatLoading() {
  return (
    <div className="flex h-full">
      {/* Session list skeleton */}
      <div className="hidden md:flex flex-col flex-shrink-0 w-56 border-r border-ink/[0.07] p-3 gap-1">
        <div className="skeleton h-9 w-full rounded-xl mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-xl" />
        ))}
      </div>

      {/* Main chat area skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-ink/[0.07]">
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        <div className="flex-1 px-6 py-6 space-y-5">
          <div className="flex gap-3">
            <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
            <div className="skeleton h-14 w-64 rounded-2xl rounded-tl-sm" />
          </div>
          <div className="flex gap-3 flex-row-reverse">
            <div className="skeleton h-10 w-48 rounded-2xl rounded-tr-sm" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
            <div className="skeleton h-20 w-72 rounded-2xl rounded-tl-sm" />
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="skeleton h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

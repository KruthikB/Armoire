export default function SettingsLoading() {
  return (
    <div className="p-8 space-y-6 max-w-lg">
      <div className="skeleton h-6 w-32 rounded-lg" />
      <div className="space-y-4">
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export default function TicketDetailLoading() {
  return (
    <div className="h-[calc(100vh-8rem)] animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="space-y-2">
          <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="w-80 bg-gray-100 dark:bg-gray-800 rounded-xl hidden lg:block" />
      </div>
    </div>
  )
}

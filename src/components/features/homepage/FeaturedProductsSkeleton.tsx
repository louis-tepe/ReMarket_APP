import { Skeleton } from '@/components/ui/skeleton';

export function FeaturedProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border rounded-lg p-0 overflow-hidden shadow-sm">
          <Skeleton className="aspect-square w-full bg-gray-200" />
          <div className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2 bg-gray-200" />
            <Skeleton className="h-4 w-1/2 mb-3 bg-gray-200" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/3 bg-gray-200" />
              <Skeleton className="h-8 w-1/4 bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
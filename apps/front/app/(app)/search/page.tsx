import { Suspense } from "react";

import { SearchContent } from "@/components/search/SearchContent";
import { Spinner } from "@/components/ui/Spinner";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

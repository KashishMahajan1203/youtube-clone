import SearchResult from "@/components/SearchResult";
import { useRouter } from "next/router";
import React from "react";

const index = () => {
  const router = useRouter();
  const { q } = router.query;
  const query = typeof q === "string" ? q : "";
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {query && (
        <h1 className="mb-6 text-2xl font-bold tracking-tight">
          Results for <span className="text-gradient-brand">“{query}”</span>
        </h1>
      )}
      <SearchResult query={query} />
    </main>
  );
};

export default index;

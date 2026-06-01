"use client";

export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <h2 className="text-lg font-bold text-navy-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-navy-500">{error?.message || "An unexpected error occurred."}</p>
        <button type="button" onClick={() => reset()} className="btn-primary mt-4">
          Try again
        </button>
      </div>
    </div>
  );
}

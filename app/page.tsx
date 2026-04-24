import Link from "next/link";

/**
 * Public home page — placeholder while we build out the admin section first.
 * Once the admin is working, this gets replaced with the real hero.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-xs uppercase tracking-[0.18em] text-muted font-semibold">
        UPCBMA Kanpur Chapter
      </div>
      <h1 className="mt-4">
        Uttar Pradesh Corrugated Box Manufacturers&rsquo; Association
      </h1>
      <p className="mt-5 text-lg text-muted max-w-prose">
        The official home of the Kanpur chapter. Site is under active
        construction &mdash; the admin section is first.
      </p>

      <div className="mt-10 flex gap-3">
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-sm bg-heading px-4 text-sm font-medium text-white hover:bg-hover"
        >
          Admin login
        </Link>
      </div>
    </main>
  );
}

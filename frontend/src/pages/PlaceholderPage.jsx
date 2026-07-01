export default function PlaceholderPage({ title, message }) {
  return (
    <section className="page-pad">
      <div className="card p-8">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </section>
  );
}

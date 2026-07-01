export default function Section({ title, children, right }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {right || null}
      </div>
      {children}
    </div>
  );
}

export default function JsonBlock({ data, maxHeight = 'max-h-96' }) {
  if (!data) return <p className="text-sm text-slate-500">No data available.</p>;
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <pre className={`${maxHeight} overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100`}>
      {text}
    </pre>
  );
}

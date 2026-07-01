export default function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="label">{label}{required ? <span className="text-red-600"> *</span> : null}</span>
      {children}
    </label>
  );
}

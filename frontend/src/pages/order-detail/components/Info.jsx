import { text } from '../../../utils/format';

export default function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">{text(value)}</p>
    </div>
  );
}

import { X } from 'lucide-react';
import { text } from '../../utils/format';

export default function ImagePreview({ image, onClose }) {
  if (!image) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{text(image.orderNo || 'Product image')}</p>
            <p className="text-xs text-slate-500">{text(image.title || image.sku || '')}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex justify-center bg-slate-50 p-5">
          <img src={image.url} alt={image.title || 'Product'} className="max-h-[70vh] rounded-xl object-contain" />
        </div>
      </div>
    </div>
  );
}

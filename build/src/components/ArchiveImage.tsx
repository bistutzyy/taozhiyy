import { useEffect, useRef, useState } from 'react';
import { Expand, ImageOff, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

type Props = { src: string; alt: string; caption: string; portrait?: boolean };

export function ArchiveImage({ src, alt, caption, portrait = false }: Props) {
  const { lang } = useI18n();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <figure className={`record-image ${portrait ? 'record-image--portrait' : ''}`}>
      {failed ? <div className="record-image-missing"><ImageOff size={22} /><span>{lang === 'zh' ? '这张留影暂时无法打开' : 'Snapshot unavailable'}</span></div> : (
        <button className="record-image-button" type="button" onClick={() => setOpen(true)} aria-label={`${lang === 'zh' ? '放大' : 'Enlarge'}: ${alt}`}>
          <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
          <span className="record-image-expand"><Expand size={16} /></span>
        </button>
      )}
      <figcaption><span className="record-image-caption-line" />{caption}</figcaption>
      {open && <dialog className="archive-lightbox" ref={dialogRef} onClose={() => setOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        aria-label={alt}>
        <button autoFocus type="button" className="archive-lightbox-close archive-icon-button" onClick={() => setOpen(false)}
          aria-label={lang === 'zh' ? '关闭图片' : 'Close image'} title={lang === 'zh' ? '关闭图片' : 'Close image'}><X size={22} /></button>
        <img src={src} alt={alt} /><p>{caption}</p>
      </dialog>}
    </figure>
  );
}

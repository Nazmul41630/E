import { useRef, useState } from 'react';
import { IconUpload } from '../../components/Icons';
import { uploadImage } from '../../api/client';

const MAX_MB = 8;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

export default function ImageField({
  label = 'ছবি',
  value,
  onChange,
  choices = [],
  error,
  hint,
  placeholder = '/images/...',
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState('');
  const [uploaded, setUploaded] = useState('');
  const justUploaded = uploaded && value === uploaded ? uploaded : '';

  const take = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNote('শুধু ছবি ফাইল দিন');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setNote('ছবিটি ৮MB এর চেয়ে বড়');
      return;
    }
    setNote('');
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
      setUploaded(url);
    } catch (err) {
      setNote(err?.message || 'আপলোড ব্যর্থ হয়েছে');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const message = note || (busy ? 'ছবি আপলোড করে লিংক তৈরি হচ্ছে…' : justUploaded ? `অট লিংক তৈরি হয়েছে: ${justUploaded}` : '');

  return (
    <div className="adm-field adm-image-field">
      <span>{label} *</span>

      <div
        className={`adm-upload${drag ? ' is-drag' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          take(e.dataTransfer.files && e.dataTransfer.files[0]);
        }}
      >
        <button type="button" className="adm-upload-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          <IconUpload />
          <strong>{busy ? 'আপলোড হচ্ছে…' : 'ছবি আপলোড করুন'}</strong>
          <small>
            টেনে ছেড়ে দিন বা ক্লিক করুন · JPG / PNG / WebP · সর্বোচ্চ ৮MB · ImgBB-তে সেভ হবে
          </small>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => take(e.target.files && e.target.files[0])}
        />
      </div>

      {message && (
        <p
          className={`adm-upload-note${note ? ' is-error' : ''}${justUploaded ? ' is-ok' : ''}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <input
        className={`adm-input${error ? ' has-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="ছবির লিংক"
      />
      {error ? (
        <small className="adm-error-text">{error}</small>
      ) : hint ? (
        <small className="adm-hint">{hint}</small>
      ) : null}

      {choices.length > 0 && (
        <div className="adm-image-picks">
          {choices.map((src) => (
            <button
              type="button"
              key={src}
              className={value === src ? 'on' : ''}
              onClick={() => onChange(src)}
              aria-label={`ছবি বেছে নিন ${src}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

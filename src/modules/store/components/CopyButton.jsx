import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

/** Copy a value; shows a check for 2s. `hideLabel` keeps the label for screen readers only. */
export function CopyButton({ text, label, copiedLabel = 'تم النسخ', className = '', hideLabel = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      notifySuccess({ message: copiedLabel });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError({ message: 'تعذر النسخ' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? copiedLabel : label}
      title={hideLabel ? label : undefined}
    >
      {copied ? <Check size={16} className="shrink-0" /> : <Copy size={16} className="shrink-0" />}
      <span className={hideLabel ? 'sr-only' : undefined}>{copied ? copiedLabel : label}</span>
    </button>
  );
}

export default CopyButton;

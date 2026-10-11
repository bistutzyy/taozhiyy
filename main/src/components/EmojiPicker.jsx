import { useId, useState } from "react";

import { EMOJI_CHOICES } from "./emojiInput.js";

const EmojiPicker = ({ disabled = false, label = "添加表情", onPick }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border-2 border-[#FFD43B] bg-[linear-gradient(135deg,#FFF7C2,#FFE8F0)] px-4 py-2 text-sm font-black text-[#5F4B52] shadow-[0_10px_24px_rgba(255,212,59,0.22)] transition hover:border-[#FF8FAB] hover:shadow-[0_12px_30px_rgba(255,143,171,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden className="text-lg leading-none">
          😊
        </span>
        {label}
      </button>

      {open && !disabled && (
        <div
          id={panelId}
          className="absolute left-0 top-[calc(100%+10px)] z-[90] w-[min(82vw,320px)] rounded-[22px] border border-[#F2E6C9] bg-white/95 p-3 shadow-[0_18px_44px_rgba(95,75,82,0.18)] backdrop-blur"
        >
          <p className="mb-2 px-1 text-xs font-bold text-[#8A7C74]">
            选择表情
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick?.(emoji)}
                className="grid size-9 place-items-center rounded-xl text-lg transition hover:bg-[#FFF3BF] focus:outline-none focus:ring-2 focus:ring-[#74C0FC]"
                aria-label={`插入 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;

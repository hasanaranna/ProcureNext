'use client';

import { useState, useRef, useEffect } from 'react';

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SlidingToggleProps<T extends string> {
  options: [ToggleOption<T>, ToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  background?: string;
  boxShadow?: string;
  pillColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  paddingX?: string;
  paddingY?: string;
  fontSize?: string;
}

export default function SlidingToggle<T extends string>({
  options,
  value,
  onChange,
  background = 'var(--color-brand-navy)',
  boxShadow = 'none',
  pillColor = 'var(--color-surface)',
  activeTextColor = 'var(--color-content-primary)',
  inactiveTextColor = 'var(--color-content-muted)',
  paddingX = 'px-3.5',
  paddingY = 'py-1',
  fontSize = 'text-sm',
}: SlidingToggleProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btn0Ref = useRef<HTMLButtonElement>(null);
  const btn1Ref = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const activeBtn = value === options[0].value ? btn0Ref.current : btn1Ref.current;
    const container = containerRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className="relative rounded p-0.5 flex items-center border border-subtle"
      style={{ background, boxShadow }}
    >
      {/* Sliding pill */}
      <div
        className="absolute rounded transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          backgroundColor: pillColor,
          height: 'calc(100% - 4px)',
          top: '2px',
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
        }}
      />
      {[btn0Ref, btn1Ref].map((ref, i) => (
        <button
          key={options[i].value}
          ref={ref}
          onClick={() => onChange(options[i].value)}
          className={`relative z-10 ${paddingX} ${paddingY} rounded ${fontSize} font-medium transition-colors duration-300 whitespace-nowrap`}
          style={{
            color: value === options[i].value ? activeTextColor : inactiveTextColor,
          }}
        >
          {options[i].label}
        </button>
      ))}
    </div>
  );
}

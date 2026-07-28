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
  background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  boxShadow = '0 4px 15px rgba(15, 23, 42, 0.25)',
  pillColor = '#ffffff',
  activeTextColor = '#0f172a',
  inactiveTextColor = '#94a3b8',
  paddingX = 'px-5',
  paddingY = 'py-1.5',
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
      className="relative rounded-full p-1 flex items-center"
      style={{ background, boxShadow }}
    >
      {/* Sliding pill */}
      <div
        className="absolute rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          backgroundColor: pillColor,
          height: 'calc(100% - 8px)',
          top: '4px',
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      />
      {[btn0Ref, btn1Ref].map((ref, i) => (
        <button
          key={options[i].value}
          ref={ref}
          onClick={() => onChange(options[i].value)}
          className={`relative z-10 ${paddingX} ${paddingY} rounded-full ${fontSize} font-semibold transition-colors duration-300 whitespace-nowrap`}
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

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
  background = 'linear-gradient(135deg, #5b6abf 0%, #3b82f6 50%, #6366f1 100%)',
  boxShadow = '0 0 12px rgba(99, 102, 241, 0.35)',
  pillColor = '#ffffff',
  activeTextColor = '#4f46e5',
  inactiveTextColor = '#e0e7ff',
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
        className="absolute rounded-full transition-all duration-300 ease-in-out"
        style={{
          backgroundColor: pillColor,
          height: 'calc(100% - 8px)',
          top: '4px',
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
        }}
      />
      {[btn0Ref, btn1Ref].map((ref, i) => (
        <button
          key={options[i].value}
          ref={ref}
          onClick={() => onChange(options[i].value)}
          className={`relative z-10 ${paddingX} ${paddingY} rounded-full ${fontSize} font-bold transition-colors duration-300`}
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

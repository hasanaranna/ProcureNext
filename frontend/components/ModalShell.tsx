"use client";

import { useState, useEffect, useRef } from "react";

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind max-w-* class or 'none' for no max-width constraint. Defaults to 'max-w-md' */
  maxWidth?: string;
  /** Custom width style, e.g. '80vw'. Overrides maxWidth when set. */
  width?: string;
  /** Custom height style, e.g. '80vh'. */
  height?: string;
}

export default function ModalShell({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-md",
  width,
  height,
}: ModalShellProps) {
  const [animating, setAnimating] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      closingRef.current = false;
      // Trigger enter animation after mount
      setTimeout(() => setAnimating(true), 0);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setAnimating(false);
    setTimeout(() => {
      closingRef.current = false;
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        animating ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className={`relative flex flex-col rounded-xl shadow-2xl overflow-y-auto transition-all duration-300 ${
          maxWidth !== "none" ? maxWidth : ""
        } w-full max-h-[calc(100vh-2rem)] ${animating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}
        style={{
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          backgroundColor: "#ffffff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Shared Button
// Every button in the app routes through this component so the tactile
// whileTap press-physics stays consistent everywhere.
// ─────────────────────────────────────────────────────────────────────────

import { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost";

// Framer Motion's <motion.button> redefines a handful of DOM event handlers
// (onDrag, onDragStart/End, onAnimation*) with its own richer signatures, so
// they need to be excluded from the native HTML props we spread onto it.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface ButtonProps extends NativeButtonProps {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-500 disabled:bg-surface-100 disabled:text-brand-900/30",
  secondary:
    "border border-brand-700/30 bg-surface-800/60 text-brand-100 hover:bg-surface-800",
  ghost: "text-brand-200 hover:bg-brand-900/40",
};

export default function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`rounded-lg px-4 py-3 font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

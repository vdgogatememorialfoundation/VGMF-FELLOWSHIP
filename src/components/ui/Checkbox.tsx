"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, onChange, ...props }, ref) => {
    const inputId = props.id || props.name;

    return (
      <label className={cn("inline-flex items-center gap-2 cursor-pointer", props.disabled && "opacity-50 cursor-not-allowed")}>
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={onChange}
          className={cn(
            "h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer",
            props.disabled && "cursor-not-allowed",
            className
          )}
          {...props}
        />
        {label && (
          <span className="text-sm text-gray-700 select-none">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

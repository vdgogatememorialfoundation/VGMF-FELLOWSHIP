"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, type, ...props }: InputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const isPasswordField = type === "password";
  const inputType = isPasswordField && passwordVisible ? "text" : type;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label-field">
          {label}
        </label>
      )}
      <div className={cn(isPasswordField && "relative")}>
        <input
          id={inputId}
          type={inputType}
          className={cn(
            "input-field",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            isPasswordField && "pr-11",
            className
          )}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

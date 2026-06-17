import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  FileText,
  Users,
  Award,
  BookOpen,
  IndianRupee,
  Microscope,
  BadgeCheck,
  Bell,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  FileText,
  Users,
  Award,
  BookOpen,
  IndianRupee,
  Microscope,
  BadgeCheck,
  Bell,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || FileText;
}

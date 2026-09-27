/**
 * Shim: wraps sonner's toast() so existing imports of
 * "@/components/ui/use-toast" keep working unchanged.
 */
import { toast as sonnerToast } from "sonner";

type ToastParams = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

function toast({ title, description, variant }: ToastParams) {
  if (variant === "destructive") {
    sonnerToast.error(title ?? "Hata", { description });
  } else {
    sonnerToast.success(title, { description });
  }
}

export function useToast() {
  return { toast };
}

import { useState, useCallback, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

let toastCount = 0;

export const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = (++toastCount).toString();
    const newToast: Toast = { id, title, description, variant };

    setState((prevState) => ({
      toasts: [...prevState.toasts, newToast],
    }));

    if (variant === 'destructive') {
      sonnerToast.error(title || description);
    } else {
      sonnerToast.success(title || description);
    }

    setTimeout(() => {
      setState((prevState) => ({
        toasts: prevState.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);

    return id;
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }));
  }, []);

  return {
    ...state,
    toast,
    dismiss,
  };
};

export const toast = {
  success: (title: string, description?: string) => sonnerToast.success(title, { description }),
  error: (title: string, description?: string) => sonnerToast.error(title, { description }),
  info: (title: string, description?: string) => sonnerToast.info(title, { description }),
  warning: (title: string, description?: string) => sonnerToast.warning(title, { description }),
};
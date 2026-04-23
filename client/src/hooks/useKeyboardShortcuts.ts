import { useEffect, useCallback } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : true;
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        if (shortcut.ctrlKey || shortcut.metaKey) {
          event.preventDefault();
        }
        shortcut.handler();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useChatShortcuts({
  onSend,
  onNewConversation,
  onToggleSidebar,
  onClearHistory,
  disabled = false,
}: {
  onSend: () => void;
  onNewConversation: () => void;
  onToggleSidebar: () => void;
  onClearHistory?: () => void;
  disabled?: boolean;
}) {
  useKeyboardShortcuts([
    {
      key: 'Enter',
      ctrlKey: true,
      handler: () => {
        if (!disabled) onSend();
      },
    },
    {
      key: 'n',
      ctrlKey: true,
      handler: onNewConversation,
    },
    {
      key: 'b',
      ctrlKey: true,
      handler: onToggleSidebar,
    },
    {
      key: 'Delete',
      ctrlKey: true,
      handler: () => {
        if (onClearHistory) onClearHistory();
      },
    },
  ]);
}

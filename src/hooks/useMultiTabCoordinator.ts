import { useEffect, useState } from 'react';

export interface TabSyncMessage {
  type: 'TASK_STARTED' | 'TASK_PROGRESS' | 'TASK_COMPLETED' | 'HEARTBEAT';
  tabId: string;
  tabTitle: string;
  payload?: any;
}

/**
 * Hook to manage multi-tab broadcast messaging and status coordination.
 * Each tab gets a unique persistent session ID and communicates over BroadcastChannel.
 * This ensures that multiple files/compressions running in different tabs run independently,
 * while giving real-time visibility into other active tabs if desired.
 */
export function useMultiTabCoordinator() {
  const [tabId, setTabId] = useState<string>('');
  const [activeTabs, setActiveTabs] = useState<{ [id: string]: { lastSeen: number; taskCount: number } }>({});

  useEffect(() => {
    // Generate unique tab id
    const currentTabId = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    setTabId(currentTabId);

    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    const channel = new BroadcastChannel('pdf_compressor_network');

    // Announce heartbeat
    const interval = setInterval(() => {
      channel.postMessage({
        type: 'HEARTBEAT',
        tabId: currentTabId,
        timestamp: Date.now(),
      });
    }, 4000);

    channel.onmessage = (event) => {
      const data = event.data;
      if (data && data.tabId && data.tabId !== currentTabId) {
        if (data.type === 'HEARTBEAT' || data.type === 'TASK_STARTED' || data.type === 'TASK_COMPLETED') {
          setActiveTabs((prev) => ({
            ...prev,
            [data.tabId]: {
              lastSeen: Date.now(),
              taskCount: data.taskCount || 0,
            },
          }));
        }
      }
    };

    // Clean up stale tabs periodically
    const cleaner = setInterval(() => {
      const now = Date.now();
      setActiveTabs((prev) => {
        const next: typeof prev = {};
        for (const [id, info] of Object.entries(prev)) {
          if (now - info.lastSeen < 12000) {
            next[id] = info;
          }
        }
        return next;
      });
    }, 6000);

    return () => {
      clearInterval(interval);
      clearInterval(cleaner);
      channel.close();
    };
  }, []);

  return {
    tabId,
    otherActiveTabsCount: Object.keys(activeTabs).length,
  };
}


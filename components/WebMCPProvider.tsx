"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initWebMCP } from '@/lib/webmcp-tools';
import { ActivityLogItem, AgentActionType } from '@/lib/types';

interface WebMCPContextType {
  isReady: boolean;
  registeredTools: string[];
  activityLogs: ActivityLogItem[];
  grandmaMode: boolean;
  toggleGrandmaMode: () => void;
  clearLogs: () => void;
  activeActionEffect: string | null;
}

const WebMCPContext = createContext<WebMCPContextType | undefined>(undefined);

export const WebMCPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [grandmaMode, setGrandmaMode] = useState<boolean>(false);
  const [activeActionEffect, setActiveActionEffect] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebMCP tools on mount
    const res = initWebMCP();
    setIsReady(res.isSupported);
    setRegisteredTools(res.registeredTools);

    // Initial orientation log
    setActivityLogs([
      {
        id: 'init-001',
        timestamp: new Date().toLocaleTimeString(),
        toolName: 'init_webmcp_system',
        input: { protocol: 'document.modelContext (W3C Draft)' },
        output: { status: 'INITIALIZED', tools: res.registeredTools },
        status: 'success',
        latencyMs: 1,
        source: 'WebMCP Agent',
      },
    ]);

    // Listener for agent activity telemetry
    const handleActivityLog = (e: Event) => {
      const customEvt = e as CustomEvent<ActivityLogItem>;
      if (customEvt.detail) {
        setActivityLogs(prev => [customEvt.detail, ...prev.slice(0, 30)]);
      }
    };

    // Listener for WebMCP actions to trigger visual pulse highlight
    const handleWebMCPAction = (e: Event) => {
      const customEvt = e as CustomEvent<{ actionType: AgentActionType; payload: any }>;
      if (customEvt.detail) {
        const actionName = customEvt.detail.actionType;
        setActiveActionEffect(actionName);
        setTimeout(() => setActiveActionEffect(null), 1800);

        if (actionName === 'TOGGLE_GRANDMA_MODE') {
          setGrandmaMode(prev => !prev);
        }
      }
    };

    window.addEventListener('webmcp-activity-log', handleActivityLog);
    window.addEventListener('webmcp-action', handleWebMCPAction);

    return () => {
      window.removeEventListener('webmcp-activity-log', handleActivityLog);
      window.removeEventListener('webmcp-action', handleWebMCPAction);
    };
  }, []);

  const toggleGrandmaMode = () => setGrandmaMode(prev => !prev);
  const clearLogs = () => setActivityLogs([]);

  return (
    <WebMCPContext.Provider
      value={{
        isReady,
        registeredTools,
        activityLogs,
        grandmaMode,
        toggleGrandmaMode,
        clearLogs,
        activeActionEffect,
      }}
    >
      <div className={grandmaMode ? 'grandma-accessible-mode' : ''}>
        {children}
      </div>
    </WebMCPContext.Provider>
  );
};

export const useWebMCP = (): WebMCPContextType => {
  const context = useContext(WebMCPContext);
  if (!context) {
    throw new Error('useWebMCP must be used within a WebMCPProvider');
  }
  return context;
};

/**
 * WebMCP Challenge Types & Standard Definitions
 * Compliant with W3C/WebMCP Draft standard (document.modelContext)
 */

export type CategoryType = 'all' | 'industrial' | 'ai-edge' | 'sensors' | 'consulting';

export interface CatalogItem {
  id: string;
  name: string;
  category: CategoryType;
  price: number;
  currency: string;
  rating: number;
  inStock: boolean;
  leadTimeDays: number;
  description: string;
  features: string[];
  specs: {
    power?: string;
    samplingRate?: string;
    connectivity?: string;
    accuracy?: string;
  };
  badge?: string;
}

export type AgentActionType = 
  | 'FILTER_CATALOG'
  | 'SELECT_ITEM'
  | 'AUTOFILL_FORM'
  | 'SUBMIT_FORM'
  | 'CLEAR_FORM'
  | 'TOGGLE_GRANDMA_MODE'
  | 'RESET_STATE';

export interface AutofillPayload {
  customerName?: string;
  email?: string;
  company?: string;
  serviceCategory?: string;
  urgencyLevel?: 'low' | 'standard' | 'emergency';
  notes?: string;
  itemId?: string;
}

export interface WebMCPActionEventDetail {
  actionType: AgentActionType;
  payload: any;
  timestamp: number;
  source: 'agent' | 'human-simulation' | 'devtools';
  toolName?: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  toolName: string;
  input: any;
  output: any;
  status: 'success' | 'error' | 'executing';
  latencyMs: number;
  source: 'WebMCP Agent' | 'Browser DevTools' | 'Interactive Test';
}

/**
 * Standard WebMCP Tool Interface
 */
export interface WebMCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
  handler: (args: any) => Promise<any> | any;
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: WebMCPToolDefinition) => void;
      unregisterTool?: (toolName: string) => void;
      getRegisteredTools?: () => WebMCPToolDefinition[];
      [key: string]: any;
    };
  }
}

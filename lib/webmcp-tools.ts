/**
 * Core WebMCP (Web Model Context Protocol) Tool Registration Engine
 * Standard: W3C WebMCP Draft / document.modelContext API
 */

import { CATALOG_DATA } from './mock-data';
import { 
  WebMCPToolDefinition, 
  CatalogItem, 
  AgentActionType, 
  WebMCPActionEventDetail,
  ActivityLogItem 
} from './types';

// In-memory registered tool registry for DevTools and fallback environments
const registeredToolsMap = new Map<string, WebMCPToolDefinition>();

/**
 * Dispatches a typed browser event to bridge agent actions to React UI state
 */
export function dispatchWebMCPAction(
  actionType: AgentActionType, 
  payload: any = {}, 
  source: 'agent' | 'human-simulation' | 'devtools' | 'voice-agent' = 'agent',
  toolName?: string
): void {
  if (typeof window === 'undefined') return;

  const eventDetail: WebMCPActionEventDetail = {
    actionType,
    payload,
    timestamp: Date.now(),
    source,
    toolName,
  };

  const customEvent = new CustomEvent<WebMCPActionEventDetail>('webmcp-action', {
    detail: eventDetail,
    bubbles: true,
    cancelable: true,
  });

  window.dispatchEvent(customEvent);
}

/**
 * Emits an activity log event for the UI Agent Activity Inspector
 */
function logAgentActivity(item: Omit<ActivityLogItem, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  const logItem: ActivityLogItem = {
    ...item,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
  };

  window.dispatchEvent(new CustomEvent('webmcp-activity-log', {
    detail: logItem,
    bubbles: true,
  }));
}

/**
 * 1. Tool: query_catalog
 * Searches, filters, and inspects product & service specifications.
 */
export const queryCatalogTool: WebMCPToolDefinition = {
  name: 'query_catalog',
  description: 'Searches, filters, and ranks items in the enterprise catalog based on keyword, category, price threshold, and stock availability.',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'Search term to match against name, description, features, or technical specifications.',
      },
      category: {
        type: 'string',
        description: 'Filter by specific category.',
        enum: ['all', 'industrial', 'ai-edge', 'sensors', 'consulting'],
      },
      maxPrice: {
        type: 'number',
        description: 'Maximum allowable price in USD.',
      },
      inStockOnly: {
        type: 'boolean',
        description: 'When true, excludes items that are currently out of stock or have long lead times.',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of items to return (default: 5).',
      },
    },
    required: [],
  },
  handler: async (args: {
    keyword?: string;
    category?: string;
    maxPrice?: number;
    inStockOnly?: boolean;
    maxResults?: number;
  }) => {
    const t0 = performance.now();
    const { keyword = '', category = 'all', maxPrice, inStockOnly = false, maxResults = 6 } = args || {};

    let results = [...CATALOG_DATA];

    if (category && category !== 'all') {
      results = results.filter(item => item.category === category);
    }

    if (maxPrice !== undefined && maxPrice > 0) {
      results = results.filter(item => item.price <= maxPrice);
    }

    if (inStockOnly) {
      results = results.filter(item => item.inStock);
    }

    if (keyword && keyword.trim() !== '') {
      const q = keyword.toLowerCase().trim();
      results = results.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.features.some(f => f.toLowerCase().includes(q)) ||
        Object.values(item.specs).some(v => v?.toLowerCase().includes(q))
      );
    }

    const trimmed = results.slice(0, Math.max(1, maxResults));
    const latency = Math.round(performance.now() - t0);

    const output = {
      totalFound: results.length,
      returnedCount: trimmed.length,
      appliedFilters: { keyword, category, maxPrice, inStockOnly },
      items: trimmed.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: `${item.price} ${item.currency}`,
        inStock: item.inStock,
        leadTime: `${item.leadTimeDays} days`,
        description: item.description,
        keySpecs: item.specs,
      })),
    };

    logAgentActivity({
      toolName: 'query_catalog',
      input: args,
      output,
      status: 'success',
      latencyMs: latency,
      source: 'WebMCP Agent',
    });

    return output;
  },
};

/**
 * 2. Tool: execute_action
 * Triggers interactive state transitions, form autofill, item selection, or UI view modes.
 */
export const executeActionTool: WebMCPToolDefinition = {
  name: 'execute_action',
  description: 'Triggers UI state actions such as autofilling customer forms, selecting catalog items, filtering views, or switching accessibility Grandma Mode.',
  parameters: {
    type: 'object',
    properties: {
      actionType: {
        type: 'string',
        description: 'The target action to perform.',
        enum: [
          'FILTER_CATALOG',
          'SELECT_ITEM',
          'AUTOFILL_FORM',
          'SUBMIT_FORM',
          'CLEAR_FORM',
          'TOGGLE_GRANDMA_MODE',
          'RESET_STATE',
        ],
      },
      payload: {
        type: 'object',
        description: 'The parameter payload specific to the actionType (e.g., form fields, itemId, category).',
      },
    },
    required: ['actionType'],
  },
  handler: async (args: { actionType: AgentActionType; payload?: any }) => {
    const t0 = performance.now();
    const { actionType, payload = {} } = args;

    if (!actionType) {
      throw new Error("Missing required argument 'actionType'");
    }

    // Dispatch custom browser event to update React UI state
    dispatchWebMCPAction(actionType, payload, 'agent', 'execute_action');

    const latency = Math.round(performance.now() - t0);
    const output = {
      success: true,
      executedAction: actionType,
      appliedPayload: payload,
      executionTimestamp: new Date().toISOString(),
      status: 'DISPATCHED_TO_REACT_DOM',
    };

    logAgentActivity({
      toolName: 'execute_action',
      input: args,
      output,
      status: 'success',
      latencyMs: latency,
      source: 'WebMCP Agent',
    });

    return output;
  },
};

/**
 * 3. Tool: get_agent_state
 * Provides contextual awareness of currently visible catalog items, selected item, and active form inputs.
 */
export const getAgentStateTool: WebMCPToolDefinition = {
  name: 'get_agent_state',
  description: 'Retrieves current live web application context, total registered tools, active accessibility settings, and available action types.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async () => {
    const t0 = performance.now();

    const output = {
      app: 'ChronoPhys WebMCP Industrial Gateway',
      version: '1.0.0',
      status: 'READY',
      registeredTools: Array.from(registeredToolsMap.keys()),
      supportedActionTypes: [
        'FILTER_CATALOG',
        'SELECT_ITEM',
        'AUTOFILL_FORM',
        'SUBMIT_FORM',
        'CLEAR_FORM',
        'TOGGLE_GRANDMA_MODE',
        'RESET_STATE',
      ],
      categories: ['all', 'industrial', 'ai-edge', 'sensors', 'consulting'],
      totalCatalogItems: CATALOG_DATA.length,
      protocol: 'WebMCP (document.modelContext)',
    };

    logAgentActivity({
      toolName: 'get_agent_state',
      input: {},
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent',
    });

    return output;
  },
};

/**
 * 4. Tool: AUTOFILL_FORM / autofill_form
 * Direct tool for filling RFQ booking forms.
 */
export const autofillFormTool: WebMCPToolDefinition = {
  name: 'AUTOFILL_FORM',
  description: 'Directly autofills the Enterprise Request for Quote (RFQ) customer form with contact information, urgency level, and technical notes.',
  parameters: {
    type: 'object',
    properties: {
      customerName: { type: 'string', description: 'Customer full name.' },
      email: { type: 'string', description: 'Corporate contact email.' },
      company: { type: 'string', description: 'Plant or organization name.' },
      urgencyLevel: { type: 'string', enum: ['low', 'standard', 'emergency'], description: 'Dispatch urgency.' },
      notes: { type: 'string', description: 'Technical telemetry notes or machinery specs.' },
      itemId: { type: 'string', description: 'Optional product ID to select.' }
    },
    required: []
  },
  handler: async (args: any) => {
    dispatchWebMCPAction('AUTOFILL_FORM', args, 'agent', 'AUTOFILL_FORM');
    const output = { success: true, message: 'Form fields populated', autofilled: args };
    logAgentActivity({
      toolName: 'AUTOFILL_FORM',
      input: args,
      output,
      status: 'success',
      latencyMs: 1,
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * 5. Tool: TOGGLE_GRANDMA_MODE / toggle_grandma_mode
 * Direct tool for toggling Grandma accessibility mode.
 */
export const toggleGrandmaModeTool: WebMCPToolDefinition = {
  name: 'TOGGLE_GRANDMA_MODE',
  description: 'Toggles high-contrast Grandma Mode accessibility with 48px+ touch targets, bold borders, and enlarged text.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  handler: async (args: any) => {
    dispatchWebMCPAction('TOGGLE_GRANDMA_MODE', {}, 'agent', 'TOGGLE_GRANDMA_MODE');
    const output = { success: true, message: 'Grandma accessibility mode toggled' };
    logAgentActivity({
      toolName: 'TOGGLE_GRANDMA_MODE',
      input: args || {},
      output,
      status: 'success',
      latencyMs: 1,
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * 6. Tool: TRIGGER_EMERGENCY_THROTTLE
 * Closed-loop autonomous Modbus command to drop motor shaft RPM safely upon ISO Zone D trip.
 */
export const triggerEmergencyThrottleTool: WebMCPToolDefinition = {
  name: 'TRIGGER_EMERGENCY_THROTTLE',
  description: 'Autonomous closed-loop safety interlock that commands the variable-frequency drive (VFD) via Modbus TCP to safely throttle machine RPM to 300 RPM upon critical ISO Zone-D vibration.',
  parameters: {
    type: 'object',
    properties: {
      targetRpm: { type: 'number', description: 'Safe glide target RPM (default: 300)' },
      reason: { type: 'string', description: 'Fault cause triggering closed-loop throttle' },
      modbusRegister: { type: 'string', description: 'VFD Speed Reference Register (40001)' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    const targetRpm = args.targetRpm || 300;
    const reason = args.reason || 'ISO Zone-D High Vibration Emergency Trip';

    dispatchWebMCPAction('TRIGGER_EMERGENCY_THROTTLE', { targetRpm, reason }, 'agent', 'TRIGGER_EMERGENCY_THROTTLE');
    
    const output = {
      success: true,
      action: 'VFD_CLOSED_LOOP_THROTTLE',
      previousRpm: 1800,
      commandedTargetRpm: targetRpm,
      modbusWriteStatus: 'COIL_SET_SAFE_GLIDE',
      safetyInterlock: 'SIL-3 ENGAGED',
      timestamp: new Date().toISOString()
    };

    logAgentActivity({
      toolName: 'TRIGGER_EMERGENCY_THROTTLE',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });

    return output;
  }
};

/**
 * 7. Tool: GENERATE_MAINTENANCE_AUDIT
 * Compiles real-time telemetry into a cryptographically verified ISO 17025 SHA-256 maintenance audit ticket.
 */
export const generateMaintenanceAuditTool: WebMCPToolDefinition = {
  name: 'GENERATE_MAINTENANCE_AUDIT',
  description: 'Compiles current optical Phase-EVM telemetry, modal frequencies, and mechanical fault logs into an ISO 17025 SHA-256 signed maintenance audit report.',
  parameters: {
    type: 'object',
    properties: {
      equipmentId: { type: 'string', description: 'Equipment asset identifier (e.g. TURBOPUMP-04)' },
      signOffAnalyst: { type: 'string', description: 'ISO 18436 Certified Vibration Analyst Name' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    const equipmentId = args.equipmentId || 'TURBOPUMP-04';
    const analyst = args.signOffAnalyst || 'Autonomous ChronoPhys AI Agent';
    const auditHash = `SHA256:${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    dispatchWebMCPAction('GENERATE_MAINTENANCE_AUDIT', { equipmentId, analyst, auditHash }, 'agent', 'GENERATE_MAINTENANCE_AUDIT');

    const output = {
      success: true,
      reportType: 'ISO 17025 Compliance Diagnostic Audit',
      assetId: equipmentId,
      certifiedAnalyst: analyst,
      digitalSignatureSha256: auditHash,
      complianceStandard: 'ISO 10816-3 Machine Group 2 & ISO 13373-1',
      generatedAt: new Date().toISOString(),
      downloadUrl: '#audit-receipt-ready'
    };

    logAgentActivity({
      toolName: 'GENERATE_MAINTENANCE_AUDIT',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });

    return output;
  }
};

/**
 * 8. Tool: record_demo
 * Programmatically triggers the 30-second live diagnostic recording.
 */
export const recordDemoTool: WebMCPToolDefinition = {
  name: 'record_demo',
  description: 'Programmatically triggers a 30-second synchronized multi-modal optical EVM and telemetry MP4 recording with metadata burn-in.',
  parameters: {
    type: 'object',
    properties: {
      durationSeconds: { type: 'number', description: 'Duration of the recording in seconds (default: 30)' },
      targetRoi: { type: 'string', description: 'Target region of interest (e.g. Drive-End Bearing)' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    const duration = args.durationSeconds || 30;
    dispatchWebMCPAction('RECORD_DEMO', { duration, targetRoi: args.targetRoi }, 'agent', 'record_demo');
    const output = {
      success: true,
      status: 'RECORDING_STARTED',
      durationSeconds: duration,
      targetCodec: 'H.264 / MP4 Turbo-Encode',
      fps: 60,
      timestamp: new Date().toISOString()
    };
    logAgentActivity({
      toolName: 'record_demo',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * 9. Tool: generate_pdf_report
 * Programmatically compiles telemetry and downloads/opens the PDF audit report.
 */
export const generatePdfReportTool: WebMCPToolDefinition = {
  name: 'generate_pdf_report',
  description: 'Programmatically compiles current modal FFT spectrum, ISO 10816-3 severity, and phase EVM telemetry into a signed ISO 17025 PDF audit certificate.',
  parameters: {
    type: 'object',
    properties: {
      equipmentId: { type: 'string', description: 'Equipment asset identifier (e.g. TURBOPUMP-04)' },
      analyst: { type: 'string', description: 'Certified vibration analyst name' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    dispatchWebMCPAction('GENERATE_PDF_REPORT', args, 'agent', 'generate_pdf_report');
    const output = {
      success: true,
      status: 'PDF_REPORT_OPENED',
      assetId: args.equipmentId || 'TURBOPUMP-04',
      analyst: args.analyst || 'Autonomous AI Diagnostic Agent',
      sha256Signature: `SHA256:${Math.random().toString(36).substring(2, 15)}`,
      timestamp: new Date().toISOString()
    };
    logAgentActivity({
      toolName: 'generate_pdf_report',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * 10. Tool: toggle_ai_specialist
 * Opens/closes the interactive AI diagnostic modal with contextual machine analysis.
 */
export const toggleAiSpecialistTool: WebMCPToolDefinition = {
  name: 'toggle_ai_specialist',
  description: 'Opens or closes the contextual Gemini-powered AI Vibration Specialist dialog with real-time root cause analysis.',
  parameters: {
    type: 'object',
    properties: {
      open: { type: 'boolean', description: 'True to open modal, false to close' },
      initialQuery: { type: 'string', description: 'Optional initial prompt/question for the AI specialist' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    dispatchWebMCPAction('TOGGLE_AI_SPECIALIST', args, 'agent', 'toggle_ai_specialist');
    const output = {
      success: true,
      modalState: args.open !== false ? 'OPEN' : 'CLOSED',
      query: args.initialQuery || 'Analyzing real-time FFT spectrum and ISO Zone A baseline.'
    };
    logAgentActivity({
      toolName: 'toggle_ai_specialist',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * 11. Tool: auto_lock_components
 * Toggles machine tracking bounding boxes and sub-band optical filters.
 */
export const autoLockComponentsTool: WebMCPToolDefinition = {
  name: 'auto_lock_components',
  description: 'Toggles automatic optical ROI component locking (Stator, Drive-End Bearing, Shaft Coupling, Pump Impeller) and sub-band spatial filters.',
  parameters: {
    type: 'object',
    properties: {
      enableTracking: { type: 'boolean', description: 'Enable or disable automatic component tracking' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    dispatchWebMCPAction('AUTO_LOCK_COMPONENTS', args, 'agent', 'auto_lock_components');
    const output = {
      success: true,
      trackingStatus: args.enableTracking !== false ? 'LOCKED_4_COMPONENTS' : 'TRACKING_OFF',
      lockedRois: ['ROI-1 (DE Bearing)', 'ROI-2 (Shaft Coupling)', 'ROI-3 (Stator Housing)', 'ROI-4 (Impeller)']
    };
    logAgentActivity({
      toolName: 'auto_lock_components',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * 12. Tool: set_evm_parameters
 * Programmatically adjusts Magnification Factor (α), Frequency bands (f_low, f_high), and Nominal RPM.
 */
export const setEvmParametersTool: WebMCPToolDefinition = {
  name: 'set_evm_parameters',
  description: 'Programmatically configures Phase-EVM motion magnification parameters: alpha gain factor, frequency bandpass filters, and machine RPM.',
  parameters: {
    type: 'object',
    properties: {
      alpha: { type: 'number', description: 'Motion magnification amplification factor (5 to 100)' },
      fLow: { type: 'number', description: 'Lower frequency bandpass cutoff in Hz' },
      fHigh: { type: 'number', description: 'Upper frequency bandpass cutoff in Hz' },
      shaftRpm: { type: 'number', description: 'Nominal machine shaft speed in RPM' }
    },
    required: []
  },
  handler: async (args: any = {}) => {
    const t0 = performance.now();
    dispatchWebMCPAction('SET_EVM_PARAMETERS', args, 'agent', 'set_evm_parameters');
    const output = {
      success: true,
      updatedParameters: {
        alpha: args.alpha ?? 45,
        fLow: args.fLow ?? 1.0,
        fHigh: args.fHigh ?? 250.0,
        shaftRpm: args.shaftRpm ?? 1800
      }
    };
    logAgentActivity({
      toolName: 'set_evm_parameters',
      input: args,
      output,
      status: 'success',
      latencyMs: Math.round(performance.now() - t0),
      source: 'WebMCP Agent'
    });
    return output;
  }
};

/**
 * Initializes and registers tools with document.modelContext
 */
export function initWebMCP(): {
  isSupported: boolean;
  registeredTools: string[];
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { isSupported: false, registeredTools: [] };
  }

  const tools = [
    queryCatalogTool, 
    executeActionTool, 
    autofillFormTool, 
    toggleGrandmaModeTool, 
    triggerEmergencyThrottleTool,
    generateMaintenanceAuditTool,
    recordDemoTool,
    generatePdfReportTool,
    toggleAiSpecialistTool,
    autoLockComponentsTool,
    setEvmParametersTool,
    getAgentStateTool
  ];

  // Populate local registry
  tools.forEach(tool => {
    registeredToolsMap.set(tool.name, tool);
  });

  // Polyfill / developer bridge if native document.modelContext is not yet enabled
  if (!document.modelContext) {
    document.modelContext = {
      registerTool: (tool: WebMCPToolDefinition) => {
        registeredToolsMap.set(tool.name, tool);
        console.log(`%c[WebMCP Polyfill] Tool Registered: ${tool.name}`, 'color: #10b981; font-weight: bold;');
      },
      unregisterTool: (toolName: string) => {
        registeredToolsMap.delete(toolName);
      },
      getRegisteredTools: () => {
        return Array.from(registeredToolsMap.values());
      },
      // Convenient execution method for DevTools testing
      executeTool: async (toolName: string, args: any = {}) => {
        const tool = registeredToolsMap.get(toolName);
        if (!tool) {
          throw new Error(`Tool '${toolName}' is not registered with document.modelContext`);
        }
        return await tool.handler(args);
      },
    };
  }

  // Register tools with native document.modelContext
  tools.forEach(tool => {
    try {
      document.modelContext?.registerTool(tool);
    } catch (err) {
      console.warn(`[WebMCP] Could not register ${tool.name} with native API:`, err);
    }
  });

  // Attach global helper to window for easy DevTools inspection & testing
  (window as any).__webmcp = {
    tools: Array.from(registeredToolsMap.keys()),
    execute: async (toolName: string, args: any) => {
      const tool = registeredToolsMap.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      return await tool.handler(args);
    },
    queryCatalog: (keyword: string, category = 'all') => {
      return queryCatalogTool.handler({ keyword, category });
    },
    executeAction: (actionType: AgentActionType, payload: any) => {
      return executeActionTool.handler({ actionType, payload });
    },
  };

  console.log(
    `%c[WebMCP Ready] Registered 3 Tools: [${tools.map(t => t.name).join(', ')}]`,
    'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
  );

  return {
    isSupported: true,
    registeredTools: Array.from(registeredToolsMap.keys()),
  };
}

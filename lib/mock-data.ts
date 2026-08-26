import { CatalogItem } from './types';

export const CATALOG_DATA: CatalogItem[] = [
  {
    id: 'prod-001',
    name: 'ChronoPhys Phase-EVM Edge Appliance',
    category: 'ai-edge',
    price: 4950,
    currency: 'USD',
    rating: 4.9,
    inStock: true,
    leadTimeDays: 3,
    description: 'Sub-pixel optical motion magnification and modal vibration analysis appliance with NVIDIA Jetson Orin.',
    features: ['Phase Eulerian Motion Magnification', 'ISO 10816-3 Dynamic Evaluation', 'Modbus TCP & MQTT Broker'],
    specs: {
      power: '24V DC / 45W',
      samplingRate: '120 FPS Optical',
      connectivity: 'Dual Gigabit LAN, RS-485',
      accuracy: 'Sub-pixel 0.001 mm'
    },
    badge: 'Popular Enterprise Choice'
  },
  {
    id: 'prod-002',
    name: 'OptiVibe Tri-Axial Laser Vibrometer Sensor',
    category: 'sensors',
    price: 2800,
    currency: 'USD',
    rating: 4.8,
    inStock: true,
    leadTimeDays: 2,
    description: 'Non-contact high-bandwidth 3-axis vibrational velocity sensor for critical turbomachinery.',
    features: ['Class 2 Eye-Safe Laser', '50 kHz Bandwidth', 'Hermetic IP67 Enclosure'],
    specs: {
      power: '12V DC',
      samplingRate: '50,000 samples/sec',
      connectivity: 'Analog 4-20mA & IO-Link',
      accuracy: '+/- 0.05 mm/s'
    },
    badge: 'High Precision'
  },
  {
    id: 'prod-003',
    name: 'Auto-Lock Machine Component Neural Camera',
    category: 'sensors',
    price: 1950,
    currency: 'USD',
    rating: 4.7,
    inStock: true,
    leadTimeDays: 1,
    description: 'Smart vision camera with edge neural detection for bearings, shaft couplings, and motor baseplates.',
    features: ['On-sensor YOLO Detection', 'ArUco Auto-Calibration', 'Low-Light Global Shutter'],
    specs: {
      power: 'PoE+ (802.3at)',
      samplingRate: '60 FPS @ 1080p',
      connectivity: 'Ethernet, Modbus TCP',
      accuracy: '99.4% Detection mAP'
    }
  },
  {
    id: 'prod-004',
    name: 'SmartRelay DIN-Rail Emergency Cut-Off Module',
    category: 'industrial',
    price: 650,
    currency: 'USD',
    rating: 4.9,
    inStock: true,
    leadTimeDays: 1,
    description: 'SIL-3 certified failsafe relay trip module with sub-10ms hardware actuation for ISO Zone D trips.',
    features: ['10ms Interlock Response', 'Dual Contact Safety Circuit', 'Modbus TCP Coil 00001'],
    specs: {
      power: '24V DC',
      connectivity: 'Modbus TCP, Dry Contacts',
      accuracy: '100% Deterministic Trip'
    },
    badge: 'Safety Certified'
  },
  {
    id: 'prod-005',
    name: 'PINN Structural Fatigue & RUL Digital Twin',
    category: 'industrial',
    price: 7200,
    currency: 'USD',
    rating: 5.0,
    inStock: true,
    leadTimeDays: 0,
    description: 'Physics-Informed Neural Network software license for remaining useful life and Basquin cyclic stress modeling.',
    features: ['Real-time Basquin Damage S-N curve', 'Three.js 3D ODS Twin', 'Automated PDF Engineering Reports'],
    specs: {
      connectivity: 'REST API, WebSockets, gRPC',
      accuracy: '96.8% Remaining Life Confidence'
    },
    badge: 'Software License'
  },
  {
    id: 'prod-006',
    name: 'ISO 18436 Cat-IV Vibration Analyst Consultation',
    category: 'consulting',
    price: 3500,
    currency: 'USD',
    rating: 5.0,
    inStock: true,
    leadTimeDays: 5,
    description: 'On-site or remote engineering audit with ISO 17025 SHA-256 cryptographically verified reporting.',
    features: ['Modal Shaker Testing', 'Root Cause Dynamic Failure Analysis', 'Signed Engineering Certificate'],
    specs: {
      connectivity: 'On-Premises / Secure Cloud Remote Audit',
      accuracy: 'ISO 17025 Certified'
    },
    badge: 'Expert Service'
  }
];

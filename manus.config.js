/**
 * Manus Deployment Configuration for ECHverse
 * Runtime configuration for Manus edge computing platform
 */

export default {
  // Project metadata
  project: {
    id: 'echverse-devoid-stack',
    name: 'ECHverse Devoid Entity Sovereign Stack',
    description: 'Production-oriented payment platform with Manus runtime',
    version: '1.0.0',
  },

  // Manus runtime settings
  runtime: {
    target: 'manus',
    version: 'latest',
    region: 'us-central1',
  },

  // Services to deploy via Manus
  services: [
    {
      name: 'apple-pay-ingress',
      path: './services/apple-pay',
      runtime: 'node',
      port: 3000,
      env: {
        KMS_EMULATOR_MODE: 'true',
        PUBSUB_TOPIC: 'state-events',
      },
      replicas: 2,
    },
    {
      name: 'chime-visa-relayer',
      path: './services/chime-relayer',
      runtime: 'node',
      port: 3001,
      env: {
        VISA_DIRECT_API_URL: 'https://sandbox.api.visa.com/visadirect/v1/pullfundstransactions',
      },
      replicas: 2,
    },
    {
      name: 'ncsecu-ach-engine',
      path: './services/nacha-engine',
      runtime: 'node',
      port: 3002,
      env: {
        ACH_ROUTING_TARGET: '253177049',
        SEC_CODES_SUPPORTED: 'PPD,WEB,CCD',
      },
      replicas: 1,
    },
  ],

  // Nexus platform (main app)
  app: {
    name: 'nexus-platform',
    path: './nexus-platform',
    runtime: 'node',
    build: {
      command: 'pnpm build',
      output: 'dist',
    },
    start: {
      command: 'NODE_ENV=production node dist/index.js',
    },
    env: {
      NODE_ENV: 'production',
      GCP_PROJECT_ID: process.env.PROJECT_ID || 'ellis-clearing-house',
      PUBSUB_EMULATOR_HOST: process.env.PUBSUB_EMULATOR_HOST,
      SPANNER_EMULATOR_HOST: process.env.SPANNER_EMULATOR_HOST,
    },
  },

  // Manus edge functions
  edge: {
    enabled: true,
    functions: [
      {
        path: '/api/*',
        runtime: 'node',
        cache: 'default',
      },
      {
        path: '/healthz',
        runtime: 'node',
        cache: 'none',
      },
    ],
  },

  // Build configuration
  build: {
    minify: true,
    sourcemap: false,
    target: 'es2020',
  },

  // Deployment
  deploy: {
    strategy: 'rolling',
    maxUnavailable: '25%',
    readinessProbe: {
      path: '/healthz',
      initialDelay: 10,
      timeout: 5,
    },
  },
};

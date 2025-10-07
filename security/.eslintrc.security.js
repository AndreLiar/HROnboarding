/**
 * ESLint Security Configuration for HR Onboarding Application
 * Focuses on detecting security vulnerabilities and bad practices
 */

module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  
  plugins: [
    'security',
    'no-secrets'
  ],
  
  extends: [
    'plugin:security/recommended'
  ],
  
  rules: {
    // Security-focused rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    
    // Secret detection
    'no-secrets/no-secrets': ['error', {
      'tolerance': 4.2,
      'additionalRegexes': {
        'Slack Token': 'xox[baprs]-([0-9a-zA-Z]{10,48})?',
        'RSA Private Key': '-----BEGIN RSA PRIVATE KEY-----',
        'SSH DSA Private Key': '-----BEGIN DSA PRIVATE KEY-----',
        'SSH EC Private Key': '-----BEGIN EC PRIVATE KEY-----',
        'PGP Private Key Block': '-----BEGIN PGP PRIVATE KEY BLOCK-----',
        'Amazon AWS Access Key ID': 'AKIA[0-9A-Z]{16}',
        'Amazon MWS Auth Token': 'amzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        'AWS API Key': 'AKIA[0-9A-Z]{16}',
        'Facebook Access Token': 'EAACEdEose0cBA[0-9A-Za-z]+',
        'GitHub Token': '[a-zA-Z0-9_]{40}',
        'Google API Key': 'AIza[0-9A-Za-z\\-_]{35}',
        'Google OAuth': '[0-9]+-[0-9A-Za-z_]{32}\\.apps\\.googleusercontent\\.com',
        'Google OAuth Access Token': 'ya29\\.[0-9A-Za-z\\-_]+',
        'Heroku API Key': '[h|H][e|E][r|R][o|O][k|K][u|U].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}',
        'MailChimp API Key': '[0-9a-f]{32}-us[0-9]{1,2}',
        'Mailgun API Key': 'key-[0-9a-zA-Z]{32}',
        'PayPal BraintreePayment Gateway Sandbox': 'sandbox_[0-9a-z]{16}',
        'Picatic API Key': 'sk_live_[0-9a-z]{32}',
        'Stripe API Key': 'sk_live_[0-9a-zA-Z]{24}',
        'Square Access Token': 'sq0atp-[0-9A-Za-z\\-_]{22}',
        'Square OAuth Secret': 'sq0csp-[0-9A-Za-z\\-_]{43}',
        'Twilio API Key': 'SK[0-9a-fA-F]{32}',
        'Twitter Access Token': '[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*[1-9][0-9]+-[0-9a-zA-Z]{40}',
        'Twitter OAuth': '[t|T][w|W][i|I][t|T][t|T][e|E][r|R].*[\'|\"][0-9a-zA-Z]{35,44}[\'|\"]'
      }
    }],
    
    // General security practices
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Prevent XSS
    'no-unsafe-innerHTML': 'off', // Use dangerouslySetInnerHTML instead for React
    
    // Prevent prototype pollution
    'no-proto': 'error',
    
    // SQL injection prevention (for API)
    'security/detect-sql-injection': 'error'
  },
  
  // Override settings for specific directories
  overrides: [
    {
      files: ['api/**/*.js'],
      rules: {
        // API-specific security rules
        'security/detect-non-literal-require': 'error',
        'security/detect-bidi-characters': 'error'
      }
    },
    {
      files: ['client/src/**/*.{js,jsx,ts,tsx}'],
      rules: {
        // Frontend-specific security rules
        'security/detect-object-injection': 'warn', // Less strict for frontend
      }
    },
    {
      files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
      rules: {
        // Relax security rules for test files
        'security/detect-non-literal-regexp': 'off',
        'no-secrets/no-secrets': 'off'
      }
    }
  ]
};
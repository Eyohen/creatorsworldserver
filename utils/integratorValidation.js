// utils/integratorValidation.js
const AcrossService = require('../services/across.service');

/**
 * Validation utility for Across.to integrator configuration
 */
class IntegratorValidation {
  /**
   * Validate integrator ID configuration
   * @returns {Object} Validation result
   */
  static validateConfiguration() {
    const integratorId = process.env.ACROSS_INTEGRATOR_ID;
    const apiUrl = process.env.ACROSS_API_URL;
    const widgetUrl = process.env.ACROSS_WIDGET_URL;
    
    const issues = [];
    const warnings = [];
    
    // Check if integrator ID is set
    if (!integratorId) {
      issues.push('ACROSS_INTEGRATOR_ID is not set in environment variables');
    } else if (integratorId.trim() === '') {
      issues.push('ACROSS_INTEGRATOR_ID is empty');
    } else if (integratorId.length < 3) {
      warnings.push('ACROSS_INTEGRATOR_ID seems unusually short');
    }
    
    // Check API URL
    if (!apiUrl) {
      warnings.push('ACROSS_API_URL not set, using default');
    } else {
      try {
        new URL(apiUrl);
      } catch (error) {
        issues.push('ACROSS_API_URL is not a valid URL');
      }
    }
    
    // Check Widget URL
    if (!widgetUrl) {
      warnings.push('ACROSS_WIDGET_URL not set, using default');
    } else {
      try {
        new URL(widgetUrl);
      } catch (error) {
        issues.push('ACROSS_WIDGET_URL is not a valid URL');
      }
    }
    
    return {
      isValid: issues.length === 0,
      integratorId,
      issues,
      warnings,
      configuration: {
        integratorId,
        apiUrl: apiUrl || 'https://across.to/api',
        widgetUrl: widgetUrl || 'https://across.to'
      }
    };
  }
  
  /**
   * Test integrator ID by making a simple API call
   * @returns {Promise<Object>} Test result
   */
  static async testIntegratorId() {
    try {
      const validation = this.validateConfiguration();
      
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Configuration validation failed',
          issues: validation.issues
        };
      }
      
      // Try to get available routes to test API access
      const routesResult = await AcrossService.getAvailableRoutes();
      
      if (routesResult.success) {
        return {
          success: true,
          message: 'Integrator ID is properly configured and API is accessible',
          integratorId: validation.integratorId,
          routesCount: routesResult.routes?.length || 0
        };
      } else {
        return {
          success: false,
          error: 'API call failed',
          details: routesResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Test failed with exception',
        details: error.message
      };
    }
  }
  
  /**
   * Generate a test widget URL to verify integrator ID inclusion
   * @returns {Object} Test widget result
   */
  static generateTestWidget() {
    try {
      const validation = this.validateConfiguration();
      
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Configuration validation failed',
          issues: validation.issues
        };
      }
      
      // Generate a test widget URL
      const testUrl = AcrossService.generateBridgeWidgetUrl({
        sourceNetwork: 'ethereum',
        destNetwork: 'optimism',
        token: 'USDC',
        amount: '100',
        recipientAddress: '0x742d35Cc6634C0532925a3b8C17C3c7D35156c3E' // Random address for testing
      });
      
      // Check if integrator ID is included in the URL
      const url = new URL(testUrl);
      const referrer = url.searchParams.get('referrer');
      
      return {
        success: true,
        testUrl,
        integratorIdIncluded: referrer === validation.integratorId,
        referrerInUrl: referrer,
        expectedReferrer: validation.integratorId
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate test widget',
        details: error.message
      };
    }
  }
  
  /**
   * Run comprehensive validation and testing
   * @returns {Promise<Object>} Complete validation result
   */
  static async runFullValidation() {
    console.log('Running Across.to integrator validation...');
    
    // Step 1: Configuration validation
    const configValidation = this.validateConfiguration();
    console.log('Configuration validation:', configValidation.isValid ? 'PASSED' : 'FAILED');
    
    if (configValidation.issues.length > 0) {
      console.log('Issues found:', configValidation.issues);
    }
    
    if (configValidation.warnings.length > 0) {
      console.log('Warnings:', configValidation.warnings);
    }
    
    // Step 2: API test
    const apiTest = await this.testIntegratorId();
    console.log('API test:', apiTest.success ? 'PASSED' : 'FAILED');
    
    if (!apiTest.success) {
      console.log('API test error:', apiTest.error);
    }
    
    // Step 3: Widget URL test
    const widgetTest = this.generateTestWidget();
    console.log('Widget URL test:', widgetTest.success ? 'PASSED' : 'FAILED');
    
    if (widgetTest.success) {
      console.log('Integrator ID in URL:', widgetTest.integratorIdIncluded ? 'YES' : 'NO');
    }
    
    return {
      overall: configValidation.isValid && apiTest.success && widgetTest.success,
      configuration: configValidation,
      apiTest,
      widgetTest,
      summary: {
        integratorId: configValidation.integratorId,
        configValid: configValidation.isValid,
        apiAccessible: apiTest.success,
        widgetWorking: widgetTest.success
      }
    };
  }
}

module.exports = IntegratorValidation;
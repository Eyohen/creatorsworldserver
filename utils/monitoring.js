// utils/monitoring.js - Comprehensive Production Monitoring & Alerting

const EventEmitter = require('events');

/**
 * Production-ready monitoring and alerting system
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    this.startTime = Date.now();

    // Initialize monitoring
    this.initializeMetrics();
    this.startHealthChecks();
  }

  /**
   * ✅ Initialize core metrics tracking
   */
  initializeMetrics() {
    const coreMetrics = [
      'payment_requests_total',
      'payment_requests_success',
      'payment_requests_failed',
      'payment_processing_duration_ms',
      'blockchain_calls_total',
      'blockchain_calls_failed',
      'webhook_deliveries_total',
      'webhook_deliveries_failed',
      'database_queries_total',
      'database_queries_slow',
      'api_response_time_ms',
      'memory_usage_mb',
      'active_connections'
    ];

    coreMetrics.forEach(metric => {
      this.metrics.set(metric, {
        value: 0,
        lastUpdated: Date.now(),
        history: []
      });
    });
  }

  /**
   * ✅ Record metric value
   */
  recordMetric(name, value, tags = {}) {
    const timestamp = Date.now();

    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        value: 0,
        lastUpdated: timestamp,
        history: []
      });
    }

    const metric = this.metrics.get(name);
    metric.value = value;
    metric.lastUpdated = timestamp;
    metric.history.push({ value, timestamp, tags });

    // Keep only last 100 entries in history
    if (metric.history.length > 100) {
      metric.history = metric.history.slice(-100);
    }

    // Check for alerts
    this.checkMetricAlerts(name, value, tags);

    // Emit metric event
    this.emit('metric', { name, value, tags, timestamp });
  }

  /**
   * ✅ Increment counter metric
   */
  incrementMetric(name, increment = 1, tags = {}) {
    const current = this.getMetric(name);
    this.recordMetric(name, current + increment, tags);
  }

  /**
   * ✅ Record timing metric
   */
  recordTiming(name, durationMs, tags = {}) {
    this.recordMetric(name, durationMs, { ...tags, type: 'timing' });
  }

  /**
   * ✅ Get metric value
   */
  getMetric(name) {
    const metric = this.metrics.get(name);
    return metric ? metric.value : 0;
  }

  /**
   * ✅ Get all metrics summary
   */
  getMetricsSummary() {
    const summary = {};
    const now = Date.now();

    for (const [name, metric] of this.metrics) {
      summary[name] = {
        value: metric.value,
        lastUpdated: metric.lastUpdated,
        ageMs: now - metric.lastUpdated
      };

      // Calculate rate for counters (per minute)
      if (metric.history.length > 1) {
        const recent = metric.history.filter(h => now - h.timestamp < 60000);
        if (recent.length > 0) {
          const rate = recent.length * (60000 / 60000); // per minute
          summary[name].ratePerMinute = rate;
        }
      }
    }

    return summary;
  }

  /**
   * ✅ Configure alert thresholds
   */
  setAlert(name, condition) {
    this.alerts.set(name, {
      ...condition,
      triggered: false,
      lastTriggered: 0,
      count: 0
    });
  }

  /**
   * ✅ Check metric against alert conditions
   */
  checkMetricAlerts(metricName, value, tags) {
    for (const [alertName, alert] of this.alerts) {
      if (alert.metric === metricName) {
        let shouldTrigger = false;

        // Check different alert types
        switch (alert.type) {
          case 'threshold':
            shouldTrigger = value > alert.threshold;
            break;
          case 'min_threshold':
            shouldTrigger = value < alert.threshold;
            break;
          case 'rate':
            // Check rate over time window
            const metric = this.metrics.get(metricName);
            const windowStart = Date.now() - alert.windowMs;
            const recentValues = metric.history.filter(h => h.timestamp > windowStart);
            const rate = recentValues.length / (alert.windowMs / 1000);
            shouldTrigger = rate > alert.threshold;
            break;
          case 'percentage':
            // Check percentage of total
            const totalMetric = this.getMetric(alert.totalMetric);
            if (totalMetric > 0) {
              const percentage = (value / totalMetric) * 100;
              shouldTrigger = percentage > alert.threshold;
            }
            break;
        }

        if (shouldTrigger && !alert.triggered) {
          this.triggerAlert(alertName, alert, metricName, value, tags);
        } else if (!shouldTrigger && alert.triggered) {
          this.resolveAlert(alertName, alert);
        }
      }
    }
  }

  /**
   * ✅ Trigger alert
   */
  triggerAlert(alertName, alert, metricName, value, tags) {
    const now = Date.now();

    // Prevent alert spam (minimum interval between same alerts)
    if (now - alert.lastTriggered < (alert.cooldownMs || 300000)) {
      return;
    }

    alert.triggered = true;
    alert.lastTriggered = now;
    alert.count++;

    const alertEvent = {
      name: alertName,
      metric: metricName,
      value,
      threshold: alert.threshold,
      severity: alert.severity || 'warning',
      message: alert.message || `Alert triggered for ${metricName}`,
      timestamp: now,
      tags,
      count: alert.count
    };

    console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alertEvent.message}`, alertEvent);

    // Emit alert event
    this.emit('alert', alertEvent);

    // Send alert notifications
    this.sendAlertNotification(alertEvent);
  }

  /**
   * ✅ Resolve alert
   */
  resolveAlert(alertName, alert) {
    if (alert.triggered) {
      alert.triggered = false;
      console.log(`✅ Alert resolved: ${alertName}`);
      this.emit('alert_resolved', { name: alertName, resolvedAt: Date.now() });
    }
  }

  /**
   * ✅ Send alert notifications
   */
  async sendAlertNotification(alert) {
    try {
      // Console notification (always enabled)
      this.logAlert(alert);

      // Webhook notification
      if (process.env.ALERT_WEBHOOK_URL) {
        await this.sendWebhookAlert(alert);
      }

      // Email notification (if configured)
      if (process.env.ALERT_EMAIL_ENABLED === 'true') {
        await this.sendEmailAlert(alert);
      }

      // Slack notification (if configured)
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(alert);
      }

    } catch (error) {
      console.error('Failed to send alert notification:', error.message);
    }
  }

  /**
   * Log alert to console/file
   */
  logAlert(alert) {
    const logEntry = {
      timestamp: new Date(alert.timestamp).toISOString(),
      level: alert.severity.toUpperCase(),
      alert: alert.name,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      message: alert.message,
      tags: alert.tags
    };

    console.log('📊 ALERT LOG:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    const axios = require('axios');

    const payload = {
      alert: alert.name,
      severity: alert.severity,
      message: alert.message,
      metric: {
        name: alert.metric,
        value: alert.value,
        threshold: alert.threshold
      },
      timestamp: alert.timestamp,
      tags: alert.tags
    };

    try {
      await axios.post(process.env.ALERT_WEBHOOK_URL, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Coinley-Monitor/1.0'
        }
      });

      console.log('📤 Alert webhook sent successfully');

    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert) {
    const axios = require('axios');

    const color = {
      'critical': '#ff0000',
      'warning': '#ffaa00',
      'info': '#0099ff'
    }[alert.severity] || '#999999';

    const payload = {
      attachments: [{
        color,
        title: `🚨 ${alert.name}`,
        text: alert.message,
        fields: [
          {
            title: 'Metric',
            value: alert.metric,
            short: true
          },
          {
            title: 'Value',
            value: alert.value.toString(),
            short: true
          },
          {
            title: 'Threshold',
            value: alert.threshold.toString(),
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          }
        ],
        timestamp: Math.floor(alert.timestamp / 1000)
      }]
    };

    try {
      await axios.post(process.env.SLACK_WEBHOOK_URL, payload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('📤 Slack alert sent successfully');

    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  /**
   * ✅ Initialize default alerts
   */
  initializeDefaultAlerts() {
    // High payment failure rate
    this.setAlert('high_payment_failure_rate', {
      metric: 'payment_requests_failed',
      type: 'percentage',
      totalMetric: 'payment_requests_total',
      threshold: 10, // 10% failure rate
      severity: 'critical',
      message: 'Payment failure rate is above 10%',
      cooldownMs: 300000 // 5 minutes
    });

    // Slow payment processing
    this.setAlert('slow_payment_processing', {
      metric: 'payment_processing_duration_ms',
      type: 'threshold',
      threshold: 30000, // 30 seconds
      severity: 'warning',
      message: 'Payment processing is taking longer than 30 seconds'
    });

    // High blockchain call failure rate
    this.setAlert('blockchain_failures', {
      metric: 'blockchain_calls_failed',
      type: 'percentage',
      totalMetric: 'blockchain_calls_total',
      threshold: 5, // 5% failure rate
      severity: 'warning',
      message: 'Blockchain call failure rate is above 5%'
    });

    // High memory usage
    this.setAlert('high_memory_usage', {
      metric: 'memory_usage_mb',
      type: 'threshold',
      threshold: 512, // 512MB
      severity: 'warning',
      message: 'Memory usage is above 512MB'
    });

    // Webhook delivery failures
    this.setAlert('webhook_delivery_failures', {
      metric: 'webhook_deliveries_failed',
      type: 'percentage',
      totalMetric: 'webhook_deliveries_total',
      threshold: 15, // 15% failure rate
      severity: 'warning',
      message: 'Webhook delivery failure rate is above 15%'
    });
  }

  /**
   * ✅ Start health checks
   */
  startHealthChecks() {
    // Memory usage check (every 30 seconds)
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.recordMetric('memory_usage_mb', Math.round(memUsage.heapUsed / 1024 / 1024));
    }, 30000);

    // System uptime
    setInterval(() => {
      const uptimeMs = Date.now() - this.startTime;
      this.recordMetric('uptime_ms', uptimeMs);
    }, 60000);
  }

  /**
   * ✅ Get system health status
   */
  getHealthStatus() {
    const now = Date.now();
    const uptime = now - this.startTime;
    const memUsage = process.memoryUsage();

    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.triggered)
      .map(alert => alert.name);

    return {
      status: activeAlerts.length === 0 ? 'healthy' : 'degraded',
      timestamp: now,
      uptime: {
        ms: uptime,
        human: this.formatDuration(uptime)
      },
      memory: {
        used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        external_mb: Math.round(memUsage.external / 1024 / 1024)
      },
      alerts: {
        active: activeAlerts.length,
        names: activeAlerts
      },
      metrics: this.getMetricsSummary()
    };
  }

  /**
   * Format duration in human readable format
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * ✅ Create middleware for automatic request tracking
   */
  createRequestTrackingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Track request start
      this.incrementMetric('api_requests_total', 1, {
        method: req.method,
        endpoint: req.path
      });

      // Track response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Record response time
        this.recordTiming('api_response_time_ms', duration, {
          method: req.method,
          endpoint: req.path,
          status: statusCode
        });

        // Track success/failure
        if (statusCode >= 200 && statusCode < 400) {
          this.incrementMetric('api_requests_success');
        } else {
          this.incrementMetric('api_requests_failed', 1, {
            status: statusCode,
            endpoint: req.path
          });
        }
      });

      next();
    };
  }
}

// Singleton instance
const monitoring = new MonitoringService();

// Initialize default alerts
monitoring.initializeDefaultAlerts();

// Export monitoring instance and utilities
module.exports = {
  monitoring,

  // Convenience functions
  recordMetric: (name, value, tags) => monitoring.recordMetric(name, value, tags),
  incrementMetric: (name, increment, tags) => monitoring.incrementMetric(name, increment, tags),
  recordTiming: (name, duration, tags) => monitoring.recordTiming(name, duration, tags),
  getHealthStatus: () => monitoring.getHealthStatus(),
  createRequestTracker: () => monitoring.createRequestTrackingMiddleware()
};
// utils/database.optimizer.js - Database Performance Optimization

const { Op } = require('sequelize');

class DatabaseOptimizer {

  /**
   * Optimized payment queries with proper indexing strategies
   */
  static getOptimizedPaymentQuery(filters = {}) {
    const whereClause = {};
    const includeClause = [];

    // Merchant filter (most selective - should be first in composite index)
    if (filters.merchantId) {
      whereClause.merchantId = filters.merchantId;
    }

    // Status filter (second most selective)
    if (filters.status) {
      whereClause.status = filters.status;
    }

    // Payment method filter
    if (filters.paymentMethod) {
      whereClause.paymentMethod = filters.paymentMethod;
    }

    // Date range filter (use index on createdAt)
    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
      };
    } else if (filters.startDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(filters.startDate)
      };
    } else if (filters.endDate) {
      whereClause.createdAt = {
        [Op.lte]: new Date(filters.endDate)
      };
    }

    // Search filter (least selective - use carefully)
    if (filters.search) {
      whereClause[Op.or] = [
        { id: { [Op.like]: `%${filters.search}%` } },
        { transactionHash: { [Op.like]: `%${filters.search}%` } },
        { splitterPaymentId: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Only include necessary associations
    if (filters.includeNetwork) {
      includeClause.push({
        model: require('../models').Network,
        attributes: ['id', 'name', 'shortName', 'chainId'], // Only needed fields
        required: false
      });
    }

    if (filters.includeToken) {
      includeClause.push({
        model: require('../models').Token,
        attributes: ['id', 'name', 'symbol', 'contractAddress', 'decimals'],
        required: false
      });
    }

    if (filters.includeMerchant) {
      includeClause.push({
        model: require('../models').Merchant,
        attributes: ['id', 'businessName', 'email'], // Only safe fields
        required: false
      });
    }

    return {
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']], // Use index on createdAt
      // Pagination should be handled by caller
    };
  }

  /**
   * Batch process payments efficiently
   */
  static async batchProcessPayments(processor, batchSize = 20) {
    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        // Get batch of pending payments
        const { Payment, Network, Token, Merchant } = require('../models');

        const payments = await Payment.findAll({
          where: {
            status: 'pending',
            paymentMethod: 'splitter'
          },
          include: [
            {
              model: Network,
              attributes: ['id', 'chainId', 'name'],
              required: true
            },
            {
              model: Token,
              attributes: ['id', 'symbol', 'decimals'],
              required: true
            },
            {
              model: Merchant,
              attributes: ['id', 'businessName'],
              required: true
            }
          ],
          limit: batchSize,
          offset: offset,
          order: [['createdAt', 'ASC']] // Process oldest first
        });

        if (payments.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch concurrently but with rate limiting
        const promises = payments.map(async (payment, index) => {
          // Stagger requests to avoid overwhelming blockchain RPC
          await new Promise(resolve => setTimeout(resolve, index * 100));

          try {
            const result = await processor.verifyAndProcessPayment(payment.id);
            if (result.success) {
              results.processed++;
            } else {
              results.failed++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              paymentId: payment.id,
              error: error.message
            });
          }
        });

        await Promise.allSettled(promises);

        offset += batchSize;

        // Add small delay between batches to prevent overwhelming the database
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error('Batch processing error:', error);
        results.errors.push({
          batch: offset / batchSize,
          error: error.message
        });
        hasMore = false;
      }
    }

    return results;
  }

  /**
   * Connection pool optimization
   */
  static getOptimizedPoolConfig() {
    return {
      max: process.env.DB_POOL_MAX || 20, // Maximum connections
      min: process.env.DB_POOL_MIN || 2,  // Minimum connections
      acquire: 30000, // 30 seconds timeout to get connection
      idle: 10000,    // 10 seconds idle timeout
      evict: 5000,    // Check for idle connections every 5 seconds
      handleDisconnects: true,
      dialectOptions: {
        // Enable connection keep-alive
        keepAlive: true,
        keepAliveInitialDelay: 0,
        // Connection timeout
        connectTimeout: 10000,
        // Statement timeout (30 seconds)
        statement_timeout: 30000,
        // Idle session timeout (5 minutes)
        idle_in_transaction_session_timeout: 300000,
      }
    };
  }

  /**
   * Query optimization recommendations
   */
  static async analyzeQueryPerformance(sequelize) {
    const recommendations = [];

    try {
      // Check for missing indexes
      const [slowQueries] = await sequelize.query(`
        SELECT query, mean_exec_time, calls
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 10;
      `);

      if (slowQueries.length > 0) {
        recommendations.push({
          type: 'slow_queries',
          count: slowQueries.length,
          queries: slowQueries
        });
      }

      // Check table sizes
      const [tableSizes] = await sequelize.query(`
        SELECT schemaname, tablename,
               pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `);

      recommendations.push({
        type: 'table_sizes',
        tables: tableSizes
      });

    } catch (error) {
      console.warn('Could not analyze query performance:', error.message);
    }

    return recommendations;
  }

  /**
   * Recommended database indexes for optimal performance
   */
  static getRecommendedIndexes() {
    return [
      {
        table: 'Payments',
        indexes: [
          // Composite index for most common query pattern
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_merchant_status_created ON "Payments" ("merchantId", status, "createdAt" DESC);',

          // Index for transaction hash lookups
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tx_hash ON "Payments" ("transactionHash") WHERE "transactionHash" IS NOT NULL;',

          // Index for status filtering
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON "Payments" (status);',

          // Index for network-based queries
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_network ON "Payments" ("networkId");',

          // Index for token-based queries
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_token ON "Payments" ("tokenId");',

          // Partial index for pending payments (most frequently queried)
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_pending ON "Payments" ("merchantId", "createdAt" DESC) WHERE status = \'pending\';',
        ]
      },
      {
        table: 'WebhookLogs',
        indexes: [
          // Index for merchant webhook log queries
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_merchant_created ON "WebhookLogs" ("merchantId", "createdAt" DESC);',

          // Index for failed webhook analysis
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_logs_status ON "WebhookLogs" (status, "createdAt" DESC);',
        ]
      },
      {
        table: 'Tokens',
        indexes: [
          // Composite index for token lookups
          'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_network_symbol ON "Tokens" ("networkId", symbol, status);',
        ]
      }
    ];
  }
}

module.exports = DatabaseOptimizer;
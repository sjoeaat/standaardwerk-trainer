// =====================================================================
// src/utils/MemoryMonitor.js - Memory Usage Monitoring Utility
// =====================================================================
// Provides comprehensive memory monitoring, leak detection, and
// performance optimization suggestions for parser operations
// =====================================================================

/**
 * Memory monitoring utility with leak detection and optimization suggestions
 */
export class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.thresholds = {
      warning: 50 * 1024 * 1024,    // 50MB
      critical: 100 * 1024 * 1024,  // 100MB
      heapGrowth: 10 * 1024 * 1024,  // 10MB growth
    };
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.leakDetectionEnabled = true;
  }

  /**
   * Start continuous memory monitoring
   */
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) {
      console.warn('Memory monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting memory monitoring...', { intervalMs });

    this.monitoringInterval = setInterval(() => {
      this.recordMeasurement();
    }, intervalMs);

    // Initial measurement
    this.recordMeasurement();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Memory monitoring stopped');
  }

  /**
   * Record a memory measurement
   */
  recordMeasurement(context = null) {
    const measurement = this.getCurrentMemoryUsage();
    measurement.context = context;
    measurement.timestamp = Date.now();
    
    this.measurements.push(measurement);
    
    // Keep only last 100 measurements to avoid memory bloat
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }

    // Check for memory issues
    this.checkMemoryHealth(measurement);
    
    return measurement;
  }

  /**
   * Get current memory usage information
   */
  getCurrentMemoryUsage() {
    const measurement = {
      timestamp: Date.now(),
      context: null,
    };

    // Use performance.memory if available (Chrome/Edge)
    if (performance.memory) {
      measurement.jsHeapSize = performance.memory.usedJSHeapSize;
      measurement.jsHeapSizeLimit = performance.memory.totalJSHeapSize;
      measurement.jsHeapTotal = performance.memory.totalJSHeapSize;
    }

    // Manual calculation for other browsers
    if (!measurement.jsHeapSize) {
      measurement.estimatedUsage = this.estimateMemoryUsage();
    }

    // Add process memory info if available (Node.js)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const nodeMemory = process.memoryUsage();
      measurement.nodeMemory = {
        rss: nodeMemory.rss,
        heapUsed: nodeMemory.heapUsed,
        heapTotal: nodeMemory.heapTotal,
        external: nodeMemory.external,
      };
    }

    return measurement;
  }

  /**
   * Estimate memory usage for browsers without performance.memory
   */
  estimateMemoryUsage() {
    // Very rough estimation based on DOM and object counts
    let estimate = 0;
    
    // DOM elements
    const elements = document.querySelectorAll('*').length;
    estimate += elements * 100; // ~100 bytes per element
    
    // Global objects (rough estimate)
    estimate += Object.keys(window).length * 50;
    
    return estimate;
  }

  /**
   * Check for memory health issues
   */
  checkMemoryHealth(measurement) {
    const issues = [];
    
    // Check absolute memory usage
    const memoryUsed = measurement.jsHeapSize || measurement.estimatedUsage || 0;
    
    if (memoryUsed > this.thresholds.critical) {
      issues.push({
        severity: 'critical',
        type: 'high_memory_usage',
        message: `Memory usage is critically high: ${this.formatBytes(memoryUsed)}`,
        suggestion: 'Consider clearing caches, disposing unused objects, or reloading the page',
      });
    } else if (memoryUsed > this.thresholds.warning) {
      issues.push({
        severity: 'warning',
        type: 'elevated_memory_usage',
        message: `Memory usage is elevated: ${this.formatBytes(memoryUsed)}`,
        suggestion: 'Monitor for memory leaks or optimize data structures',
      });
    }

    // Check for memory leaks (rapid growth)
    if (this.leakDetectionEnabled && this.measurements.length > 5) {
      const leakDetection = this.detectMemoryLeaks();
      if (leakDetection.isPotentialLeak) {
        issues.push(leakDetection);
      }
    }

    // Report issues
    if (issues.length > 0) {
      this.reportMemoryIssues(issues, measurement);
    }
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks() {
    const recentMeasurements = this.measurements.slice(-5);
    const growthRates = [];
    
    for (let i = 1; i < recentMeasurements.length; i++) {
      const current = recentMeasurements[i].jsHeapSize || 0;
      const previous = recentMeasurements[i - 1].jsHeapSize || 0;
      const growth = current - previous;
      growthRates.push(growth);
    }

    const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const isPotentialLeak = avgGrowth > this.thresholds.heapGrowth;

    return {
      severity: 'warning',
      type: 'potential_memory_leak',
      isPotentialLeak,
      averageGrowth: avgGrowth,
      message: isPotentialLeak ? 
        `Potential memory leak detected: ${this.formatBytes(avgGrowth)} average growth` :
        'No memory leak detected',
      suggestion: isPotentialLeak ?
        'Check for event listeners, timers, or objects that are not being properly cleaned up' :
        null,
    };
  }

  /**
   * Report memory issues to console and optional callback
   */
  reportMemoryIssues(issues, measurement) {
    issues.forEach(issue => {
      const logLevel = issue.severity === 'critical' ? 'error' : 'warn';
      console[logLevel](`🧠 Memory ${issue.severity.toUpperCase()}: ${issue.message}`);
      if (issue.suggestion) {
        console.info(`💡 Suggestion: ${issue.suggestion}`);
      }
    });

    // Call optional callback
    if (this.onMemoryIssue) {
      this.onMemoryIssue(issues, measurement);
    }
  }

  /**
   * Get memory statistics
   */
  getStatistics() {
    if (this.measurements.length === 0) {
      return { error: 'No measurements available' };
    }

    const measurements = this.measurements.filter(m => m.jsHeapSize);
    if (measurements.length === 0) {
      return { error: 'No heap size measurements available' };
    }

    const heapSizes = measurements.map(m => m.jsHeapSize);
    const min = Math.min(...heapSizes);
    const max = Math.max(...heapSizes);
    const avg = heapSizes.reduce((a, b) => a + b, 0) / heapSizes.length;
    const current = measurements[measurements.length - 1].jsHeapSize;

    return {
      measurementCount: this.measurements.length,
      timeSpan: measurements.length > 1 ? 
        measurements[measurements.length - 1].timestamp - measurements[0].timestamp : 0,
      memory: {
        current: this.formatBytes(current),
        min: this.formatBytes(min),
        max: this.formatBytes(max),
        average: this.formatBytes(avg),
        growth: measurements.length > 1 ? 
          this.formatBytes(current - measurements[0].jsHeapSize) : '0B',
      },
      health: this.getHealthStatus(current),
    };
  }

  /**
   * Get health status based on current memory usage
   */
  getHealthStatus(currentMemory) {
    if (currentMemory > this.thresholds.critical) {
      return { status: 'critical', color: 'red' };
    } else if (currentMemory > this.thresholds.warning) {
      return { status: 'warning', color: 'orange' };
    } else {
      return { status: 'good', color: 'green' };
    }
  }

  /**
   * Format bytes for human-readable display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (window.gc) {
      console.log('🗑️ Forcing garbage collection...');
      window.gc();
      
      // Record measurement after GC
      setTimeout(() => {
        this.recordMeasurement('after_gc');
      }, 100);
    } else {
      console.warn('Garbage collection not available. Run Chrome with --enable-precise-memory-info --expose-gc');
    }
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Enable/disable leak detection
   */
  setLeakDetection(enabled) {
    this.leakDetectionEnabled = enabled;
  }

  /**
   * Set callback for memory issues
   */
  onMemoryIssue(callback) {
    this.onMemoryIssue = callback;
  }

  /**
   * Clear all measurements
   */
  clearMeasurements() {
    this.measurements = [];
  }

  /**
   * Export measurements for analysis
   */
  exportMeasurements() {
    return {
      measurements: this.measurements,
      statistics: this.getStatistics(),
      thresholds: this.thresholds,
      timestamp: new Date().toISOString(),
    };
  }
}

// Global memory monitor instance
export const globalMemoryMonitor = new MemoryMonitor();

// Utility function to monitor a specific operation
export async function monitorOperation(operationName, operation) {
  const monitor = globalMemoryMonitor;
  
  // Record before
  const before = monitor.recordMeasurement(`before_${operationName}`);
  
  try {
    const result = await operation();
    
    // Record after
    const after = monitor.recordMeasurement(`after_${operationName}`);
    
    // Calculate operation impact
    const memoryDiff = (after.jsHeapSize || 0) - (before.jsHeapSize || 0);
    
    console.log(`📊 Operation "${operationName}" completed:`, {
      memoryBefore: monitor.formatBytes(before.jsHeapSize || 0),
      memoryAfter: monitor.formatBytes(after.jsHeapSize || 0),
      memoryDiff: monitor.formatBytes(Math.abs(memoryDiff)),
      trend: memoryDiff > 0 ? 'increased' : memoryDiff < 0 ? 'decreased' : 'unchanged',
    });
    
    return result;
  } catch (error) {
    // Record on error too
    monitor.recordMeasurement(`error_${operationName}`);
    throw error;
  }
}

export default globalMemoryMonitor;
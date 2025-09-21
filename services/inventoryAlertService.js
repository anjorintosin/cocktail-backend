const Inventory = require('../models/Inventory');
const emailService = require('./emailService');

class InventoryAlertService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Check inventory levels and send alerts if necessary
   */
  async checkInventoryLevels() {
    if (this.isProcessing) {
      console.log('⚠️  Inventory check already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🔍 Checking inventory levels...');

    try {
      // Find all low stock items
      const lowStockItems = await Inventory.findLowStock();
      const criticalStockItems = await Inventory.findCriticalStock();

      console.log(`📊 Found ${lowStockItems.length} low stock items, ${criticalStockItems.length} critical items`);

      // Process critical stock alerts
      for (const item of criticalStockItems) {
        await this.processCriticalStockAlert(item);
      }

      // Process low stock alerts
      for (const item of lowStockItems) {
        await this.processLowStockAlert(item);
      }

      console.log('✅ Inventory level check completed');
    } catch (error) {
      console.error('❌ Error checking inventory levels:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process critical stock alert
   */
  async processCriticalStockAlert(inventoryItem) {
    const settings = inventoryItem.alertSettings;
    
    // Check if alerts are enabled
    if (!settings.isEnabled) return;

    // Check if we should send alert based on frequency
    if (!this.shouldSendAlert(settings)) return;

    console.log(`🚨 Critical stock alert for ${inventoryItem.cocktail.name}`);

    // Send email alert
    await this.sendCriticalStockEmail(inventoryItem);

    // Update last alert sent time
    inventoryItem.alertSettings.lastAlertSent = new Date();
    await inventoryItem.save();
  }

  /**
   * Process low stock alert
   */
  async processLowStockAlert(inventoryItem) {
    const settings = inventoryItem.alertSettings;
    
    // Skip if it's already critical (handled separately)
    if (inventoryItem.isStockCritical()) return;

    // Check if alerts are enabled
    if (!settings.isEnabled) return;

    // Check if we should send alert based on frequency
    if (!this.shouldSendAlert(settings)) return;

    console.log(`⚠️  Low stock alert for ${inventoryItem.cocktail.name}`);

    // Send email alert
    await this.sendLowStockEmail(inventoryItem);

    // Update last alert sent time
    inventoryItem.alertSettings.lastAlertSent = new Date();
    await inventoryItem.save();
  }

  /**
   * Check if we should send alert based on frequency settings
   */
  shouldSendAlert(settings) {
    if (!settings.lastAlertSent) return true;

    const now = new Date();
    const lastAlert = new Date(settings.lastAlertSent);
    const timeDiff = now - lastAlert;

    switch (settings.frequency) {
      case 'immediate':
        return true; // Always send for critical items
      case 'daily':
        return timeDiff >= 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return timeDiff >= 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return timeDiff >= 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return timeDiff >= 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  /**
   * Send critical stock email alert
   */
  async sendCriticalStockEmail(inventoryItem) {
    try {
      const adminEmails = await this.getAdminEmails();
      
      for (const email of adminEmails) {
        await emailService.sendCriticalStockAlert(inventoryItem, email);
      }
    } catch (error) {
      console.error('Failed to send critical stock email:', error);
    }
  }

  /**
   * Send low stock email alert
   */
  async sendLowStockEmail(inventoryItem) {
    try {
      const adminEmails = await this.getAdminEmails();
      
      for (const email of adminEmails) {
        await emailService.sendLowStockAlert(inventoryItem, email);
      }
    } catch (error) {
      console.error('Failed to send low stock email:', error);
    }
  }

  /**
   * Get admin email addresses
   */
  async getAdminEmails() {
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin', isActive: true }).select('email');
    return admins.map(admin => admin.email);
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport() {
    try {
      const lowStockItems = await Inventory.findLowStock();
      const criticalStockItems = await Inventory.findCriticalStock();
      const outOfStockItems = await Inventory.find({
        isActive: true,
        currentStock: 0
      }).populate('cocktail', 'name description image');

      const report = {
        timestamp: new Date(),
        summary: {
          totalItems: await Inventory.countDocuments({ isActive: true }),
          lowStock: lowStockItems.length,
          criticalStock: criticalStockItems.length,
          outOfStock: outOfStockItems.length
        },
        lowStock: lowStockItems,
        criticalStock: criticalStockItems,
        outOfStock: outOfStockItems
      };

      return report;
    } catch (error) {
      console.error('Failed to generate inventory report:', error);
      throw error;
    }
  }

  /**
   * Send inventory report email to admins
   */
  async sendInventoryReportEmail() {
    try {
      const report = await this.generateInventoryReport();
      const adminEmails = await this.getAdminEmails();
      
      for (const email of adminEmails) {
        await emailService.sendInventoryReport(report, email);
      }
    } catch (error) {
      console.error('Failed to send inventory report email:', error);
    }
  }

  /**
   * Start periodic inventory checking
   */
  startPeriodicCheck(intervalMinutes = 60) {
    console.log(`⏰ Starting periodic inventory check every ${intervalMinutes} minutes`);
    
    // Run initial check
    this.checkInventoryLevels();
    
    // Set up periodic checks
    setInterval(() => {
      this.checkInventoryLevels();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Process order and update inventory
   */
  async processOrderInventory(order) {
    try {
      console.log(`📦 Processing inventory for order ${order.orderNumber}`);
      
      for (const item of order.items) {
        const inventoryItem = await Inventory.findOne({
          cocktail: item.cocktail,
          isActive: true
        });

        if (inventoryItem) {
          // Check if we have enough stock
          if (inventoryItem.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.cocktail.name}. Available: ${inventoryItem.currentStock}, Required: ${item.quantity}`);
          }

          // Reduce stock
          await inventoryItem.reduceStock(item.quantity);
          console.log(`✅ Reduced stock for ${item.cocktail.name} by ${item.quantity}`);
        } else {
          console.log(`⚠️  No inventory record found for ${item.cocktail.name}`);
        }
      }

      // Check inventory levels after order processing
      await this.checkInventoryLevels();
    } catch (error) {
      console.error('Failed to process order inventory:', error);
      throw error;
    }
  }
}

module.exports = new InventoryAlertService();

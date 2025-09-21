const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Verify transporter configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ Gmail SMTP connection failed:', error.message);
      console.log('Please check your Gmail credentials in the .env file');
    }
  }

  /**
   * Generate OTP for email validation
   */
  generateOTP() {
    const secret = speakeasy.generateSecret({
      name: 'Cocktail Ordering System',
      issuer: 'Clyp AI'
    });

    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      step: 300, // 5 minutes
      window: 1
    });

    return {
      token,
      secret: secret.base32
    };
  }

  /**
   * Verify OTP token
   */
  verifyOTP(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      step: 300, // 5 minutes
      window: 1
    });
  }

  /**
   * Send OTP email for email validation
   */
  async sendOTPEmail(email, otpToken) {
    try {
      const mailOptions = {
        from: {
          name: 'Cocktail Ordering System',
          address: process.env.GMAIL_USER
        },
        to: email,
        subject: 'Email Verification - Cocktail Ordering System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🍹 Cocktail Ordering System</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for using our cocktail ordering system! To complete your email verification, 
                please use the following One-Time Password (OTP):
              </p>
              
              <div style="background-color: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                  ${otpToken}
                </h1>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                <strong>Important:</strong>
              </p>
              <ul style="color: #666; font-size: 14px;">
                <li>This OTP will expire in 10 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this verification, please ignore this email</li>
              </ul>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated message from Cocktail Ordering System.<br>
                  If you have any questions, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(order) {
    try {
      const mailOptions = {
        from: {
          name: 'Cocktail Ordering System',
          address: process.env.GMAIL_USER
        },
        to: order.customer.email || 'customer@example.com', // You might want to add email to customer model
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🍹 Order Confirmed!</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Thank you for your order!</h2>
              
              <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">Order Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Customer:</strong> ${order.customer.name}</p>
                <p><strong>Phone:</strong> ${order.customer.phone}</p>
                <p><strong>Address:</strong> ${order.customer.address}, ${order.customer.state}</p>
                <p><strong>Total Amount:</strong> ₦${order.totalAmount}</p>
                <p><strong>Status:</strong> ${order.fulfillmentStatus}</p>
                <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
              </div>
              
              <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">Order Items</h3>
                ${order.items.map(item => `
                  <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <p style="margin: 0;"><strong>${item.cocktail.name}</strong> × ${item.quantity}</p>
                    <p style="margin: 0; color: #666;">₦${item.price} each</p>
                  </div>
                `).join('')}
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.BASE_URL}/orders/${order.orderNumber}" 
                   style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Track Your Order
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated message from Cocktail Ordering System.<br>
                  If you have any questions, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Order confirmation email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdateEmail(order, newStatus, adminNote = '') {
    try {
      const statusMessages = {
        'new': 'Your order has been received and is being processed',
        'preparing': 'Your order is being prepared and will be ready soon',
        'delivered': 'Your order has been delivered successfully',
        'cancelled': 'Your order has been cancelled'
      };

      const mailOptions = {
        from: {
          name: 'Cocktail Ordering System',
          address: process.env.GMAIL_USER
        },
        to: order.customer.email || 'customer@example.com',
        subject: `Order Update - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📦 Order Update</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Order Status Update</h2>
              
              <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">Order: ${order.orderNumber}</h3>
                <p><strong>Customer:</strong> ${order.customer.name}</p>
                <p><strong>New Status:</strong> <span style="color: #667eea; font-weight: bold;">${newStatus.toUpperCase()}</span></p>
                <p><strong>Update:</strong> ${statusMessages[newStatus] || 'Your order status has been updated'}</p>
                ${adminNote ? `<p><strong>Note:</strong> ${adminNote}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.BASE_URL}/orders/${order.orderNumber}" 
                   style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Track Your Order
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated message from Cocktail Ordering System.<br>
                  If you have any questions, please contact our support team.
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Order status update email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send order status update email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send critical stock alert email
   */
  async sendCriticalStockAlert(inventoryItem, adminEmail) {
    try {
      const mailOptions = {
        from: {
          name: 'Cocktail Ordering System - Inventory Alert',
          address: process.env.GMAIL_USER
        },
        to: adminEmail,
        subject: `🚨 CRITICAL STOCK ALERT - ${inventoryItem.cocktail.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚨 CRITICAL STOCK ALERT</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa;">
              <div style="background-color: #fff; border-left: 5px solid #ff6b6b; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #ff6b6b; margin-top: 0;">${inventoryItem.cocktail.name}</h2>
                <p style="color: #333; font-size: 18px; margin: 10px 0;">
                  <strong>Current Stock:</strong> <span style="color: #ff6b6b; font-size: 24px;">${inventoryItem.currentStock} ${inventoryItem.unit}</span>
                </p>
                <p style="color: #666;">
                  <strong>Alert Threshold:</strong> ${inventoryItem.alertSettings.alertThreshold} ${inventoryItem.unit}<br>
                  <strong>Minimum Stock:</strong> ${inventoryItem.minimumStock} ${inventoryItem.unit}<br>
                  <strong>Maximum Stock:</strong> ${inventoryItem.maximumStock} ${inventoryItem.unit}
                </p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <h3 style="color: #856404; margin-top: 0;">⚠️ Immediate Action Required</h3>
                <p style="color: #856404; margin: 0;">
                  This item has reached critical stock levels and may become unavailable for orders soon. 
                  Please restock immediately to avoid service disruption.
                </p>
              </div>
              
              <div style="background-color: #fff; border-radius: 8px; padding: 20px;">
                <h3 style="color: #333; margin-top: 0;">Restock Information</h3>
                ${inventoryItem.supplier.name ? `
                  <p><strong>Supplier:</strong> ${inventoryItem.supplier.name}</p>
                  ${inventoryItem.supplier.contact.phone ? `<p><strong>Phone:</strong> ${inventoryItem.supplier.contact.phone}</p>` : ''}
                  ${inventoryItem.supplier.contact.email ? `<p><strong>Email:</strong> ${inventoryItem.supplier.contact.email}</p>` : ''}
                ` : '<p style="color: #666;">No supplier information available</p>'}
                <p><strong>Cost per Unit:</strong> ₦${inventoryItem.costPerUnit}</p>
                <p><strong>Recommended Restock:</strong> ${inventoryItem.maximumStock - inventoryItem.currentStock} ${inventoryItem.unit}</p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated alert from Cocktail Ordering System.<br>
                  Alert frequency: ${inventoryItem.alertSettings.frequency}
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Critical stock alert email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send critical stock alert email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send low stock alert email
   */
  async sendLowStockAlert(inventoryItem, adminEmail) {
    try {
      const mailOptions = {
        from: {
          name: 'Cocktail Ordering System - Inventory Alert',
          address: process.env.GMAIL_USER
        },
        to: adminEmail,
        subject: `⚠️ Low Stock Alert - ${inventoryItem.cocktail.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Low Stock Alert</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa;">
              <div style="background-color: #fff; border-left: 5px solid #f39c12; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #f39c12; margin-top: 0;">${inventoryItem.cocktail.name}</h2>
                <p style="color: #333; font-size: 18px; margin: 10px 0;">
                  <strong>Current Stock:</strong> <span style="color: #f39c12; font-size: 24px;">${inventoryItem.currentStock} ${inventoryItem.unit}</span>
                </p>
                <p style="color: #666;">
                  <strong>Minimum Stock:</strong> ${inventoryItem.minimumStock} ${inventoryItem.unit}<br>
                  <strong>Maximum Stock:</strong> ${inventoryItem.maximumStock} ${inventoryItem.unit}
                </p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <h3 style="color: #856404; margin-top: 0;">📋 Restock Recommended</h3>
                <p style="color: #856404; margin: 0;">
                  This item is running low on stock. Consider restocking soon to maintain service quality.
                </p>
              </div>
              
              <div style="background-color: #fff; border-radius: 8px; padding: 20px;">
                <h3 style="color: #333; margin-top: 0;">Restock Information</h3>
                ${inventoryItem.supplier.name ? `
                  <p><strong>Supplier:</strong> ${inventoryItem.supplier.name}</p>
                  ${inventoryItem.supplier.contact.phone ? `<p><strong>Phone:</strong> ${inventoryItem.supplier.contact.phone}</p>` : ''}
                  ${inventoryItem.supplier.contact.email ? `<p><strong>Email:</strong> ${inventoryItem.supplier.contact.email}</p>` : ''}
                ` : '<p style="color: #666;">No supplier information available</p>'}
                <p><strong>Cost per Unit:</strong> ₦${inventoryItem.costPerUnit}</p>
                <p><strong>Recommended Restock:</strong> ${inventoryItem.maximumStock - inventoryItem.currentStock} ${inventoryItem.unit}</p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated alert from Cocktail Ordering System.<br>
                  Alert frequency: ${inventoryItem.alertSettings.frequency}
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Low stock alert email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send low stock alert email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send inventory report email
   */
  async sendInventoryReport(report, adminEmail) {
    try {
      const mailOptions = {
        from: {
          name: 'Cocktail Ordering System - Inventory Report',
          address: process.env.GMAIL_USER
        },
        to: adminEmail,
        subject: `📊 Inventory Report - ${report.summary.totalItems} Items`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📊 Inventory Report</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">
                Generated on ${new Date(report.timestamp).toLocaleDateString()}
              </p>
            </div>
            
            <div style="padding: 30px; background-color: #f8f9fa;">
              <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-top: 0;">📈 Summary</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div style="text-align: center; padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
                    <h4 style="margin: 0; color: #1976d2;">Total Items</h4>
                    <p style="font-size: 24px; margin: 5px 0; color: #1976d2; font-weight: bold;">${report.summary.totalItems}</p>
                  </div>
                  <div style="text-align: center; padding: 15px; background-color: #fff3e0; border-radius: 5px;">
                    <h4 style="margin: 0; color: #f57c00;">Low Stock</h4>
                    <p style="font-size: 24px; margin: 5px 0; color: #f57c00; font-weight: bold;">${report.summary.lowStock}</p>
                  </div>
                  <div style="text-align: center; padding: 15px; background-color: #ffebee; border-radius: 5px;">
                    <h4 style="margin: 0; color: #d32f2f;">Critical Stock</h4>
                    <p style="font-size: 24px; margin: 5px 0; color: #d32f2f; font-weight: bold;">${report.summary.criticalStock}</p>
                  </div>
                  <div style="text-align: center; padding: 15px; background-color: #f3e5f5; border-radius: 5px;">
                    <h4 style="margin: 0; color: #7b1fa2;">Out of Stock</h4>
                    <p style="font-size: 24px; margin: 5px 0; color: #7b1fa2; font-weight: bold;">${report.summary.outOfStock}</p>
                  </div>
                </div>
              </div>
              
              ${report.criticalStock.length > 0 ? `
                <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #d32f2f; margin-top: 0;">🚨 Critical Stock Items</h3>
                  ${report.criticalStock.map(item => `
                    <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                      <strong>${item.cocktail.name}</strong> - ${item.currentStock} ${item.unit} (Threshold: ${item.alertSettings.alertThreshold})
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${report.lowStock.length > 0 ? `
                <div style="background-color: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #f57c00; margin-top: 0;">⚠️ Low Stock Items</h3>
                  ${report.lowStock.map(item => `
                    <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                      <strong>${item.cocktail.name}</strong> - ${item.currentStock} ${item.unit} (Minimum: ${item.minimumStock})
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated inventory report from Cocktail Ordering System.
                </p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Inventory report email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send inventory report email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();

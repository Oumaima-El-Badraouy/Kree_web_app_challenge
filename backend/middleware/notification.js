// Notification Service - Handles sending notifications to customers
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    // Email configuration (using Gmail or your preferred email service)
    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // SMS configuration (using Twilio)
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    this.frontendUrl = process.env.FRONTEND_URL || 'http://192.168.0.159:8081';
  }

  // Send email notification
  async sendEmailNotification(customerEmail, customerName, proposalData) {
    const emailContent = this.generateEmailTemplate(customerName, proposalData);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `New Car Rental Proposal Received - ${proposalData.car.make} ${proposalData.car.model}`,
      html: emailContent,
      text: this.generateEmailText(customerName, proposalData)
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email notification sent to ${customerEmail}`);
      return { success: true, method: 'email' };
    } catch (error) {
      console.error('Email notification failed:', error);
      throw error;
    }
  }

  // Send SMS notification
  async sendSMSNotification(customerPhone, customerName, proposalData) {
    const message = this.generateSMSMessage(customerName, proposalData);

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customerPhone
      });
      console.log(`SMS notification sent to ${customerPhone}`);
      return { success: true, method: 'sms' };
    } catch (error) {
      console.error('SMS notification failed:', error);
      throw error;
    }
  }

  // Send in-app notification (real-time)
  async sendInAppNotification(customerId, proposalData) {
    // This would typically be handled by your existing Socket.io setup
    const notification = {
      type: 'new_proposal',
      title: 'New Car Rental Proposal',
      message: `New proposal received from ${proposalData.agencyName} for ${proposalData.car.make} ${proposalData.car.model}`,
      data: {
        proposalId: proposalData.proposalId,
        requestId: proposalData.requestId,
        car: proposalData.car,
        pricePerDay: proposalData.pricing.pricePerDay,
        agencyName: proposalData.agencyName,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date(),
      read: false
    };

    try {
      // Save notification to database
      await this.saveNotificationToDatabase(customerId, notification);
      
      // Emit via Socket.io if available
      if (this.socket) {
        this.socket.to(`customer_${customerId}`).emit('new_notification', notification);
      }

      console.log(`In-app notification sent to customer ${customerId}`);
      return { success: true, method: 'in_app' };
    } catch (error) {
      console.error('In-app notification failed:', error);
      throw error;
    }
  }

  // Send comprehensive notification (all channels)
  async sendProposalNotification(customerData, proposalData, notificationPreferences = {}) {
    const results = [];
    
    try {
      // Send in-app notification (usually the primary notification)
      if (notificationPreferences.inApp !== false) {
        const inAppResult = await this.sendInAppNotification(customerData._id, proposalData);
        results.push(inAppResult);
      }

      // Send email notification if enabled and email provided
      if (notificationPreferences.email !== false && customerData.email) {
        const emailResult = await this.sendEmailNotification(
          customerData.email, 
          customerData.name, 
          proposalData
        );
        results.push(emailResult);
      }

      // Send SMS notification if enabled and phone provided
      if (notificationPreferences.sms !== false && customerData.phone) {
        const smsResult = await this.sendSMSNotification(
          customerData.phone, 
          customerData.name, 
          proposalData
        );
        results.push(smsResult);
      }

      return {
        success: true,
        message: 'Notifications sent successfully',
        results: results,
        totalSent: results.length
      };

    } catch (error) {
      console.error('Notification service error:', error);
      return {
        success: false,
        message: 'Some notifications failed to send',
        error: error.message,
        results: results,
        totalSent: results.length
      };
    }
  }

  // Generate email HTML template
  generateEmailTemplate(customerName, proposalData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Car Rental Proposal</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .proposal-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 New Car Rental Proposal</h1>
        </div>
        
        <div class="content">
          <p>Hello ${customerName},</p>
          
          <p>Great news! You've received a new proposal for your car rental request.</p>
          
          <div class="proposal-details">
            <h3>Proposal Details:</h3>
            <p><strong>Agency:</strong> ${proposalData.agencyName}</p>
            <p><strong>Car:</strong> ${proposalData.car.year} ${proposalData.car.make} ${proposalData.car.model}</p>
            <p><strong>Category:</strong> ${proposalData.car.category}</p>
            <p><strong>Price per day:</strong> ${proposalData.pricing.pricePerDay} MAD</p>
            <p><strong>Pickup Location:</strong> ${proposalData.pickupLocation.address}, ${proposalData.pickupLocation.city}</p>
            ${proposalData.agencyNotes ? `<p><strong>Notes:</strong> ${proposalData.agencyNotes}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${this.frontendUrl}/customer/requests/${proposalData.requestId}" class="btn">
              View Proposal
            </a>
          </div>
          
          <p>Click the button above to review and respond to this proposal.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from your car rental platform.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Generate email text version
  generateEmailText(customerName, proposalData) {
    return `
Hello ${customerName},

Great news! You've received a new proposal for your car rental request.

Proposal Details:
- Agency: ${proposalData.agencyName}
- Car: ${proposalData.car.year} ${proposalData.car.make} ${proposalData.car.model}
- Category: ${proposalData.car.category}
- Price per day: ${proposalData.pricing.pricePerDay} MAD
- Pickup Location: ${proposalData.pickupLocation.address}, ${proposalData.pickupLocation.city}
${proposalData.agencyNotes ? `- Notes: ${proposalData.agencyNotes}` : ''}

Visit your dashboard to review and respond to this proposal:
${this.frontendUrl}/customer/requests/${proposalData.requestId}

This is an automated notification from your car rental platform.
    `;
  }

  // Generate SMS message
  generateSMSMessage(customerName, proposalData) {
    return `Hello ${customerName}! You've received a new car rental proposal from ${proposalData.agencyName} for a ${proposalData.car.year} ${proposalData.car.make} ${proposalData.car.model} at ${proposalData.pricing.pricePerDay} MAD/day. Check your dashboard to review: ${this.frontendUrl}/customer/requests/${proposalData.requestId}`;
  }

  // Save notification to database
  async saveNotificationToDatabase(customerId, notification) {
    // This would integrate with your database
    // Example with MongoDB/Mongoose:
    // const Notification = require('../models/Notification');
    // const newNotification = new Notification({ ...notification, customerId });
    // await newNotification.save();
    
    console.log(`Notification saved to database for customer ${customerId}`);
  }

  // Set Socket.io instance for real-time notifications
  setSocketInstance(socket) {
    this.socket = socket;
  }
}

module.exports = new NotificationService();
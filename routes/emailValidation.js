const express = require('express');
const { body, validationResult } = require('express-validator');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailValidationRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address to validate
 *           example: "user@example.com"
 *     OTPVerificationRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *         otp:
 *           type: string
 *           description: OTP token received via email
 *           example: "123456"
 */

/**
 * @swagger
 * /email/send-otp:
 *   post:
 *     summary: Send OTP for email validation (Public endpoint)
 *     tags: [Email Validation]
 *     description: |
 *       Send a One-Time Password (OTP) to the specified email address for validation.
 *       The OTP will be sent via Gmail SMTP and expires in 10 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset, admin_registration]
 *                 default: email_verification
 *                 description: Purpose of the OTP
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *                   description: OTP expiration time
 *       400:
 *         description: Validation error or email already verified
 *       500:
 *         description: Internal server error or email sending failed
 */
router.post('/send-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('purpose')
    .optional()
    .isIn(['email_verification', 'password_reset', 'admin_registration'])
    .withMessage('Invalid purpose specified')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, purpose = 'email_verification' } = req.body;

    // Check if there's already an unused OTP for this email
    const existingOTP = await OTP.findOne({
      email,
      isUsed: false,
      purpose,
      expiresAt: { $gt: new Date() }
    });

    if (existingOTP) {
      return res.status(400).json({
        error: 'OTP already sent',
        message: 'An OTP has already been sent to this email. Please wait or try again later.',
        expiresAt: existingOTP.expiresAt
      });
    }

    // Generate new OTP
    const { token, secret } = emailService.generateOTP();

    // Save OTP to database
    const otpRecord = new OTP({
      email,
      token,
      secret,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    });

    await otpRecord.save();

    // Send OTP via email
    const emailResult = await emailService.sendOTPEmail(email, token);

    if (!emailResult.success) {
      // Remove OTP record if email failed
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(500).json({
        error: 'Email sending failed',
        message: 'Unable to send OTP email. Please try again later.',
        details: emailResult.error
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address',
      expiresIn: '10 minutes',
      purpose
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'Failed to send OTP',
      message: 'Unable to send OTP at this time'
    });
  }
});

/**
 * @swagger
 * /email/verify-otp:
 *   post:
 *     summary: Verify OTP for email validation (Public endpoint)
 *     tags: [Email Validation]
 *     description: |
 *       Verify the OTP token sent to the email address.
 *       If valid, the email will be marked as verified.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: OTP token received via email
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset, admin_registration]
 *                 default: email_verification
 *                 description: Purpose of the OTP
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *                 verifiedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid OTP or validation error
 *       404:
 *         description: OTP not found or expired
 *       500:
 *         description: Internal server error
 */
router.post('/verify-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .isLength({ min: 4, max: 8 })
    .withMessage('OTP must be between 4 and 8 characters'),
  body('purpose')
    .optional()
    .isIn(['email_verification', 'password_reset', 'admin_registration'])
    .withMessage('Invalid purpose specified')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, otp, purpose = 'email_verification' } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({
      email,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(404).json({
        error: 'OTP not found',
        message: 'OTP not found, expired, or already used. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isValid = emailService.verifyOTP(otp, otpRecord.secret);

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid OTP',
        message: 'The OTP you provided is invalid or expired.'
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      email,
      verifiedAt: otpRecord.verifiedAt,
      purpose
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: 'Failed to verify OTP',
      message: 'Unable to verify OTP at this time'
    });
  }
});

/**
 * @swagger
 * /email/resend-otp:
 *   post:
 *     summary: Resend OTP for email validation (Public endpoint)
 *     tags: [Email Validation]
 *     description: |
 *       Resend OTP to the specified email address.
 *       This will invalidate any existing OTP for the email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset, admin_registration]
 *                 default: email_verification
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/resend-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('purpose')
    .optional()
    .isIn(['email_verification', 'password_reset', 'admin_registration'])
    .withMessage('Invalid purpose specified')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, purpose = 'email_verification' } = req.body;

    // Invalidate any existing OTP for this email
    await OTP.updateMany(
      { email, purpose, isUsed: false },
      { isUsed: true }
    );

    // Generate new OTP
    const { token, secret } = emailService.generateOTP();

    // Save new OTP to database
    const otpRecord = new OTP({
      email,
      token,
      secret,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    });

    await otpRecord.save();

    // Send new OTP via email
    const emailResult = await emailService.sendOTPEmail(email, token);

    if (!emailResult.success) {
      // Remove OTP record if email failed
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(500).json({
        error: 'Email sending failed',
        message: 'Unable to resend OTP email. Please try again later.',
        details: emailResult.error
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully to your email address',
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      error: 'Failed to resend OTP',
      message: 'Unable to resend OTP at this time'
    });
  }
});

module.exports = router;

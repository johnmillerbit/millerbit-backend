/**
 * @file Email utility for sending emails via Nodemailer.
 * This file configures the email transporter and provides a function to send emails.
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Nodemailer transporter configured to use Gmail with credentials from environment variables.
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

/**
 * Sends an email using the pre-configured transporter.
 *
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} text - The plain text body of the email.
 * @param {string} html - The HTML body of the email.
 * @throws Will throw an error if the email fails to send.
 */
export const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
};

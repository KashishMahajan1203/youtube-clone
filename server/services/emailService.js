import nodemailer from "nodemailer";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateInvoicePDF = (invoiceData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Invoice Header
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice Details
    doc.fontSize(12);
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`);
    doc.text(`Date: ${invoiceData.date}`);
    doc.moveDown();

    // User Details
    doc.text('Bill To:');
    doc.text(`${invoiceData.userName}`);
    doc.text(`${invoiceData.userEmail}`);
    doc.moveDown();

    // Transaction Details
    doc.text('Transaction Details:');
    doc.text(`Transaction ID: ${invoiceData.transactionId}`);
    doc.text(`Plan: ${invoiceData.plan}`);
    doc.text(`Amount: ₹${invoiceData.amount} INR`);
    doc.text(`Valid Until: ${invoiceData.planExpiry}`);
    doc.moveDown();

    // Footer
    doc.text('Thank you for your subscription!', { align: 'center' });
    doc.text('Video Platform Team', { align: 'center' });

    doc.end();
  });
};

export const sendInvoiceEmail = async (userEmail, userName, plan, amount, planExpiry, transactionId) => {
  try {
    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const invoiceData = {
      invoiceNumber,
      date: new Date().toLocaleDateString(),
      userName: userName || userEmail,
      userEmail,
      transactionId,
      plan,
      amount,
      planExpiry: planExpiry.toDateString(),
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Your Subscription Invoice - Video Platform",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payment Confirmation & Invoice</h2>
          <p>Dear ${userName || userEmail},</p>
          <p>Thank you for your payment! Your subscription has been successfully activated.</p>

          <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Subscription Details:</h3>
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Plan:</strong> ${plan}</p>
            <p><strong>Amount:</strong> ₹${amount} INR</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Valid Until:</strong> ${planExpiry.toDateString()}</p>
          </div>

          <p>Please find your invoice attached as a PDF for your records.</p>
          <p>You can now enjoy unlimited access to our premium content according to your plan limits.</p>

          <p>Best regards,<br>Video Platform Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent successfully to ${userEmail}. Invoice: ${invoiceNumber}, Transaction: ${transactionId}`);
  } catch (error) {
    console.error("Error sending invoice email:", error);
    throw error;
  }
};

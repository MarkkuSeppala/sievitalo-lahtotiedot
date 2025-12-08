import { Resend } from 'resend';

// Initialize Resend only when API key is available
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(apiKey);
};

export interface FormSubmissionEmailData {
  customerName: string;
  customerEmail: string;
  representativeEmail: string;
  formUrl: string;
}

export const sendFormSubmissionEmail = async (data: FormSubmissionEmailData): Promise<void> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      const errorMsg = 'RESEND_API_KEY is not set. Please configure RESEND_API_KEY environment variable.';
      console.error('❌ Email service error:', errorMsg);
      throw new Error(errorMsg);
    }

    const resend = getResend();
    const { customerName, customerEmail, representativeEmail, formUrl } = data;

    // Format from email with friendly name (Resend API format: "Name <email>")
    const fromEmailRaw = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromEmail = fromEmailRaw.includes('<') 
      ? fromEmailRaw 
      : `Lähtötiedot-järjestelmä <${fromEmailRaw}>`;
    
    // In development/test mode, redirect emails to test address if configured
    // This is needed because Resend test mode only allows sending to the API key's registered email
    // Check for development mode (NODE_ENV can be 'development' or not 'production')
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const testEmail = process.env.RESEND_TEST_EMAIL;
    const actualRecipient = (isDevelopment && testEmail) ? testEmail : representativeEmail;
    
    if (isDevelopment && testEmail && actualRecipient !== representativeEmail) {
      console.log(`⚠️ Development mode: Redirecting email from ${representativeEmail} to test address ${testEmail}`);
    }
    
    console.log(`📧 Attempting to send email to ${actualRecipient} from ${fromEmail}`);

    // Plain text version
    const textContent = `
Hei,

Asiakas ${customerName} (${customerEmail}) on lähettänyt lomakkeen lähtötiedot.

Voit tarkastella täytettyä lomaketta seuraavasta linkistä:
${formUrl}

Terveisin,
Lähtötiedot-järjestelmä
    `.trim();

    // HTML version for better email client support
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Uusi lomake saapunut</h2>
    </div>
    <div class="content">
      <p>Hei,</p>
      <p>Asiakas <strong>${customerName}</strong> (${customerEmail}) on lähettänyt lomakkeen lähtötiedot.</p>
      <p>Voit tarkastella täytettyä lomaketta alla olevasta linkistä:</p>
      <p><a href="${formUrl}" class="button">Avaa lomake</a></p>
      <p>Tai kopioi tämä linkki selaimen osoitepalkkiin:</p>
      <p style="word-break: break-all; color: #007bff;">${formUrl}</p>
    </div>
    <div class="footer">
      <p>Terveisin,<br>Lähtötiedot-järjestelmä</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email using Resend API (to must be an array according to documentation)
    const result = await resend.emails.send({
      from: fromEmail,
      to: [actualRecipient], // Resend API requires array for 'to' parameter
      subject: `Lomake saapunut asiakkaalta ${customerName}`,
      html: htmlContent,
      text: textContent, // Plain text fallback for email clients that don't support HTML
    });

    if (result.error) {
      console.error('❌ Resend API error:', JSON.stringify(result.error, null, 2));
      throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
    }

    console.log('✅ Email sent successfully:', {
      id: result.data?.id,
      to: actualRecipient,
      originalRecipient: representativeEmail,
      from: fromEmail
    });
  } catch (error: any) {
    console.error('❌ Error sending email:', {
      message: error.message,
      stack: error.stack,
      data: data
    });
    throw error;
  }
};


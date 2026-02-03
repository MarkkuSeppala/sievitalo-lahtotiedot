import nodemailer from 'nodemailer';

const getTransport = () => {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!user || !password) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be set. Use Gmail App Password for Gmail.');
  }
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass: password },
  });
};

export interface FormSubmissionEmailData {
  customerName: string;
  customerEmail: string;
  representativeEmail: string;
  formUrl: string;
}

export const sendFormSubmissionEmail = async (data: FormSubmissionEmailData): Promise<void> => {
  try {
    const { customerName, customerEmail, representativeEmail, formUrl } = data;

    const fromRaw = process.env.EMAIL_FROM;
    if (!fromRaw) {
      const errorMsg = 'EMAIL_FROM is not set. Please configure EMAIL_FROM environment variable.';
      console.error('❌ Email service error:', errorMsg);
      throw new Error(errorMsg);
    }
    const fromEmail = fromRaw.includes('<') ? fromRaw : `Lähtötiedot-järjestelmä <${fromRaw}>`;

    console.log(`📧 Attempting to send email to ${representativeEmail} from ${fromEmail}`);

    const textContent = `
Hei,

Asiakas ${customerName} (${customerEmail}) on lähettänyt lomakkeen lähtötiedot.

Voit tarkastella täytettyä lomaketta seuraavasta linkistä:
${formUrl}

Terveisin,
Lähtötiedot-järjestelmä
    `.trim();

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

    const transport = getTransport();
    const info = await transport.sendMail({
      from: fromEmail,
      to: representativeEmail,
      subject: `Lomake saapunut asiakkaalta ${customerName}`,
      text: textContent,
      html: htmlContent,
    });

    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      to: representativeEmail,
      from: fromEmail,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error('❌ Error sending email:', {
      message: err.message,
      stack: err.stack,
      data,
    });
    throw error;
  }
};

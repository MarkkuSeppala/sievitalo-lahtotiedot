import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface FormSubmissionEmailData {
  customerName: string;
  customerEmail: string;
  representativeEmail: string;
  formUrl: string;
}

export const sendFormSubmissionEmail = async (data: FormSubmissionEmailData): Promise<void> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      throw new Error('Email service not configured');
    }

    const { customerName, customerEmail, representativeEmail, formUrl } = data;

    const emailContent = `
Hei,

Asiakas ${customerName} (${customerEmail}) on lähettänyt lomakkeen lähtötiedot.

Voit tarkastella täytettyä lomaketta seuraavasta linkistä:
${formUrl}

Terveisin,
Lähtötiedot-järjestelmä
    `.trim();

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@sievitalo.fi',
      to: representativeEmail,
      subject: `Lomake saapunut asiakkaalta ${customerName}`,
      text: emailContent,
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      throw new Error('Failed to send email');
    }

    console.log('Email sent successfully:', result.data);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};


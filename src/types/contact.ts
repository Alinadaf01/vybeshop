export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  submittedAt: string;
}

export type ContactMessageInput = Omit<ContactMessage, "id" | "submittedAt">;

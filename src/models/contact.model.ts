export type LinkPrecedence = "primary" | "secondary";

export type Contact = {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: LinkPrecedence;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type IdentifyRequestBody = {
  email?: string | null;
  phoneNumber?: string | number | null;
};

export type NormalizedIdentifyInput = {
  email: string | null;
  phoneNumber: string | null;
};

export type IdentifyResponse = {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
};

export const LINK_PRECEDENCE = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
} as const;

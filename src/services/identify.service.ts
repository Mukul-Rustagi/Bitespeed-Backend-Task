import {
  LINK_PRECEDENCE,
  type Contact,
  type IdentifyRequestBody,
  type IdentifyResponse,
  type NormalizedIdentifyInput,
} from "../models/contact.model";
import { contactRepository } from "../repositories/contact.repository";
import { AppError } from "../utils/app-error";

const byAgeThenId = (a: Contact, b: Contact): number => {
  const createdAtDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return a.id - b.id;
};

const unique = <T>(items: T[]): T[] => [...new Set(items)];

const normalizeIdentifyInput = (input: IdentifyRequestBody): NormalizedIdentifyInput => {
  const normalizedEmail =
    typeof input.email === "string" && input.email.trim().length > 0
      ? input.email.trim().toLowerCase()
      : null;
  const normalizedPhoneNumber =
    (typeof input.phoneNumber === "string" || typeof input.phoneNumber === "number") &&
    String(input.phoneNumber).trim().length > 0
      ? String(input.phoneNumber).trim()
      : null;

  return {
    email: normalizedEmail,
    phoneNumber: normalizedPhoneNumber,
  };
};

const resolvePrimaryContact = (contacts: Contact[]): Contact => {
  const primaryCandidates = contacts.filter(
    (contact) => contact.linkPrecedence === LINK_PRECEDENCE.PRIMARY,
  );
  const candidates = primaryCandidates.length > 0 ? primaryCandidates : contacts;

  if (candidates.length === 0) {
    throw new Error("No contacts available.");
  }

  return [...candidates].sort(byAgeThenId)[0];
};

const loadConnectedCluster = (seedContacts: Contact[]): Contact[] => {
  const resolved = new Map<number, Contact>(seedContacts.map((contact) => [contact.id, contact]));
  let hasNewContacts = true;

  while (hasNewContacts) {
    hasNewContacts = false;

    const relationIds = unique(
      [...resolved.keys(), ...Array.from(resolved.values()).map((contact) => contact.linkedId)].filter(
        (value): value is number => typeof value === "number",
      ),
    );

    if (relationIds.length === 0) {
      break;
    }

    const connectedContacts = contactRepository.findContactsByRelationIds(relationIds);

    for (const contact of connectedContacts) {
      if (!resolved.has(contact.id)) {
        resolved.set(contact.id, contact);
        hasNewContacts = true;
      }
    }
  }

  return Array.from(resolved.values());
};

const buildResponse = (contacts: Contact[]): IdentifyResponse => {
  const sorted = [...contacts].sort(byAgeThenId);
  const primary = resolvePrimaryContact(sorted);

  const emails = unique(
    [
      primary.email,
      ...sorted
        .filter((contact) => contact.id !== primary.id)
        .map((contact) => contact.email),
    ].filter((email): email is string => typeof email === "string"),
  );

  const phoneNumbers = unique(
    [
      primary.phoneNumber,
      ...sorted
        .filter((contact) => contact.id !== primary.id)
        .map((contact) => contact.phoneNumber),
    ].filter((phoneNumber): phoneNumber is string => typeof phoneNumber === "string"),
  );

  const secondaryContactIds = sorted
    .filter((contact) => contact.id !== primary.id)
    .map((contact) => contact.id);

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
};

const identifyInTransaction = (input: NormalizedIdentifyInput): IdentifyResponse => {
  const directlyMatchedContacts = contactRepository.findMatches(input);

  if (directlyMatchedContacts.length === 0) {
    const createdPrimary = contactRepository.createContact({
      email: input.email,
      phoneNumber: input.phoneNumber,
      linkedId: null,
      linkPrecedence: LINK_PRECEDENCE.PRIMARY,
    });

    return buildResponse([createdPrimary]);
  }

  let cluster = loadConnectedCluster(directlyMatchedContacts);
  const canonicalPrimary = resolvePrimaryContact(cluster);

  const obsoletePrimaryIds = cluster
    .filter(
      (contact) =>
        contact.linkPrecedence === LINK_PRECEDENCE.PRIMARY && contact.id !== canonicalPrimary.id,
    )
    .map((contact) => contact.id);

  contactRepository.reassignChildrenToPrimary(obsoletePrimaryIds, canonicalPrimary.id);
  contactRepository.convertPrimariesToSecondaries(obsoletePrimaryIds, canonicalPrimary.id);

  cluster = loadConnectedCluster([canonicalPrimary]);

  const knownEmails = new Set(
    cluster
      .map((contact) => contact.email)
      .filter((email): email is string => typeof email === "string"),
  );
  const knownPhoneNumbers = new Set(
    cluster
      .map((contact) => contact.phoneNumber)
      .filter((phoneNumber): phoneNumber is string => typeof phoneNumber === "string"),
  );

  const hasNewEmail = input.email !== null && !knownEmails.has(input.email);
  const hasNewPhoneNumber = input.phoneNumber !== null && !knownPhoneNumbers.has(input.phoneNumber);

  if (hasNewEmail || hasNewPhoneNumber) {
    const createdSecondary = contactRepository.createContact({
      email: input.email,
      phoneNumber: input.phoneNumber,
      linkedId: canonicalPrimary.id,
      linkPrecedence: LINK_PRECEDENCE.SECONDARY,
    });

    cluster.push(createdSecondary);
  }

  return buildResponse(cluster);
};

export const identifyContact = (requestBody: IdentifyRequestBody): IdentifyResponse => {
  const normalizedInput = normalizeIdentifyInput(requestBody);

  if (!normalizedInput.email && !normalizedInput.phoneNumber) {
    throw new AppError(400, "Either email or phoneNumber must be provided.");
  }

  return contactRepository.runInTransaction(() => identifyInTransaction(normalizedInput));
};
